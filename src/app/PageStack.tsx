import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { PagePathContext } from './pagePath'
import {
  dragDirection,
  layerTransforms,
  releaseCompletesBack,
  STACK_DURATION_MS,
  STACK_EASING,
  stackChange,
} from './stackMotion'

/**
 * Pages inside a tab (e.g. Settings › Appearance › App colors) as an iOS navigation stack: an
 * opened page slides in over the one it came from, Back slides it away, and a swipe to the right
 * drags it away with the finger while the page below moves into place.
 *
 * At rest only the current page is shown, scrolling in the tab's own container. While moving,
 * both pages are absolutely placed layers, each kept at its own scroll position; their
 * transforms are set directly on the DOM (no render per frame), so dragging stays smooth.
 */

type Motion =
  | { readonly kind: 'idle' }
  /** following the finger */
  | { readonly kind: 'drag'; readonly top: string; readonly under: string }
  | {
      readonly kind: 'slide'
      readonly top: string
      readonly under: string
      /** progress from and to (0: the top page covers all, 1: it is gone) */
      readonly from: number
      readonly to: 0 | 1
      /** whether the address goes back to `under` once the slide is over */
      readonly thenBack: boolean
    }
  /** slid away, waiting for the address to follow */
  | { readonly kind: 'gone'; readonly top: string; readonly under: string }

type Gesture = {
  readonly startX: number
  readonly startY: number
  direction: 'back' | 'other' | null
  dx: number
  lastX: number
  lastTime: number
  /** px per ms, from the last two moves */
  velocity: number
}

type PageStackProps = {
  /** the page to show */
  readonly path: string
  /** the page one level up, where a swipe or Back leads; null on the tab's own page */
  readonly backPath: string | null
  /** false while the tab is out of view: changes then happen without moving */
  readonly animated: boolean
  /** the tab's scroll container */
  readonly container: HTMLElement | null
  readonly renderPage: () => ReactNode
  readonly onBack: (path: string) => void
}

// the shade over the page below, at its darkest
const MAX_DIM = 0.1
// the speed of a flick is measured over at least this long (a frame or two of touch events)
const MIN_VELOCITY_INTERVAL_MS = 8
const TOP_SHADOW = '-8px 0 24px rgba(0, 0, 0, 0.12)'

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function screenWidth(container: HTMLElement | null): number {
  return container?.clientWidth || window.innerWidth
}

/** The DOM of the stack's layers by page path: the layer, its content and (below) its shade. */
type LayerElements = {
  readonly layers: Map<string, HTMLDivElement>
  readonly contents: Map<string, HTMLDivElement>
  readonly shades: Map<string, HTMLDivElement>
}

function placeLayers(
  elements: LayerElements,
  { top, under }: { readonly top: string; readonly under: string },
  progress: number,
  width: number,
): void {
  const transforms = layerTransforms(progress, width)
  const topLayer = elements.layers.get(top)
  const underLayer = elements.layers.get(under)
  const shade = elements.shades.get(under)
  if (topLayer) topLayer.style.transform = transforms.top
  if (underLayer) underLayer.style.transform = transforms.under
  if (shade) shade.style.opacity = String(transforms.dim * MAX_DIM)
}

/** 'none' while following the finger or jumping to a start position. */
function setLayerTransition(elements: LayerElements, paths: readonly string[], timing: string) {
  for (const key of paths) {
    const layer = elements.layers.get(key)
    const shade = elements.shades.get(key)
    if (layer) layer.style.transition = timing === 'none' ? 'none' : `transform ${timing}`
    if (shade) shade.style.transition = timing === 'none' ? 'none' : `opacity ${timing}`
  }
}

/** Each moving page shows the part it was scrolled to. */
function offsetContents(
  elements: LayerElements,
  scrolls: ReadonlyMap<string, number>,
  paths: readonly string[],
): void {
  for (const key of paths) {
    const content = elements.contents.get(key)
    if (content) content.style.transform = `translateY(-${scrolls.get(key) ?? 0}px)`
  }
}

/** At rest a page is plain content again: no transform, offset or transition left over. */
function resetLayer(elements: LayerElements, path: string): void {
  const layer = elements.layers.get(path)
  const content = elements.contents.get(path)
  if (layer) {
    layer.style.transform = ''
    layer.style.transition = ''
  }
  if (content) content.style.transform = ''
}

/** While pages move, the tab's container stands still at its top; at rest it scrolls again. */
function holdContainer(container: HTMLElement, restScrollTop: number | null): void {
  if (restScrollTop === null) {
    container.style.overflowY = 'hidden'
    container.scrollTop = 0
    return
  }
  container.style.overflowY = ''
  container.scrollTop = restScrollTop
}

function isSwipeLocked(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-swipe-lock]') !== null
}

/** The motion for a new address, given the one shown so far. */
function motionFor(from: string, to: string, current: Motion, animated: boolean): Motion {
  // a swipe or Back that already slid the page away
  if (current.kind === 'gone' && current.under === to) return { kind: 'idle' }
  const change = stackChange(from, to)
  if (!animated || !change || prefersReducedMotion()) return { kind: 'idle' }
  return change === 'push'
    ? { kind: 'slide', top: to, under: from, from: 1, to: 0, thenBack: false }
    : { kind: 'slide', top: from, under: to, from: 0, to: 1, thenBack: false }
}

export function PageStack({
  path,
  backPath,
  animated,
  container,
  renderPage,
  onBack,
}: PageStackProps) {
  const [shownPath, setShownPath] = useState(path)
  const [motion, setMotion] = useState<Motion>({ kind: 'idle' })
  const elements = useRef<LayerElements>({
    layers: new Map(),
    contents: new Map(),
    shades: new Map(),
  })
  // each page's scroll position, so the page below shows where it was left
  const scrolls = useRef(new Map<string, number>())
  const gesture = useRef<Gesture | null>(null)
  const latest = useRef({ path, backPath, motion, onBack })

  // the address changed: start the matching slide right away, in this render (no flash)
  if (path !== shownPath) {
    setShownPath(path)
    setMotion(motionFor(shownPath, path, motion, animated))
  }

  useEffect(() => {
    latest.current = { path, backPath, motion, onBack }
  })

  // remember the scroll position of the page at rest
  useEffect(() => {
    if (!container) return
    const remember = () => {
      if (latest.current.motion.kind === 'idle') {
        scrolls.current.set(latest.current.path, container.scrollTop)
      }
    }
    container.addEventListener('scroll', remember, { passive: true })
    return () => container.removeEventListener('scroll', remember)
  }, [container])

  // moving layers are absolutely placed: the container itself must not scroll meanwhile
  useLayoutEffect(() => {
    if (!container) return
    holdContainer(container, motion.kind === 'idle' ? (scrolls.current.get(path) ?? 0) : null)
  }, [container, motion.kind, path])

  // drive the layers for the current motion
  useLayoutEffect(() => {
    const dom = elements.current
    if (motion.kind === 'idle') {
      resetLayer(dom, path)
      return
    }
    const paths = [motion.under, motion.top]
    // a newly opened page starts at its top
    if (motion.kind === 'slide' && motion.from === 1) scrolls.current.delete(motion.top)
    offsetContents(dom, scrolls.current, paths)
    const width = screenWidth(container)
    if (motion.kind !== 'slide') {
      setLayerTransition(dom, paths, 'none')
      const progress = motion.kind === 'gone' ? 1 : (gesture.current?.dx ?? 0) / width
      placeLayers(dom, motion, progress, width)
      return
    }
    setLayerTransition(dom, paths, 'none')
    placeLayers(dom, motion, motion.from, width)
    // apply the start position before the transition begins
    dom.layers.get(motion.top)?.getBoundingClientRect()
    setLayerTransition(dom, paths, `${STACK_DURATION_MS}ms ${STACK_EASING}`)
    placeLayers(dom, motion, motion.to, width)
    const timer = setTimeout(() => {
      if (motion.thenBack) {
        setMotion({ kind: 'gone', top: motion.top, under: motion.under })
        latest.current.onBack(motion.under)
      } else {
        setMotion({ kind: 'idle' })
      }
    }, STACK_DURATION_MS)
    return () => clearTimeout(timer)
  }, [motion, container, path])

  // the back swipe
  useEffect(() => {
    if (!container) return
    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      const { backPath: back, motion: current } = latest.current
      gesture.current =
        touch && back && current.kind === 'idle' && !isSwipeLocked(event.target)
          ? {
              startX: touch.clientX,
              startY: touch.clientY,
              direction: null,
              dx: 0,
              lastX: touch.clientX,
              lastTime: performance.now(),
              velocity: 0,
            }
          : null
    }
    const onMove = (event: TouchEvent) => {
      const drag = gesture.current
      const touch = event.touches[0]
      if (!drag || !touch || drag.direction === 'other') return
      const dx = touch.clientX - drag.startX
      if (drag.direction === null) {
        drag.direction = dragDirection(dx, touch.clientY - drag.startY)
        const back = latest.current.backPath
        if (drag.direction !== 'back' || !back) return
        setMotion({ kind: 'drag', top: latest.current.path, under: back })
      }
      // sideways now belongs to the swipe, not to scrolling
      event.preventDefault()
      const now = performance.now()
      const interval = now - drag.lastTime
      // 120 Hz touch events come faster: measure from the last sample old enough
      if (interval >= MIN_VELOCITY_INTERVAL_MS) {
        drag.velocity = (touch.clientX - drag.lastX) / interval
        drag.lastX = touch.clientX
        drag.lastTime = now
      }
      drag.dx = Math.max(0, dx)
      const current = latest.current.motion
      if (current.kind === 'drag') {
        const width = screenWidth(container)
        placeLayers(elements.current, current, drag.dx / width, width)
      }
    }
    const onEnd = () => {
      const drag = gesture.current
      gesture.current = null
      const { path: top, backPath: under } = latest.current
      if (!drag || drag.direction !== 'back' || !under) return
      const progress = drag.dx / screenWidth(container)
      const back = releaseCompletesBack(drag.dx, screenWidth(container), drag.velocity)
      if (prefersReducedMotion()) {
        if (!back) return setMotion({ kind: 'idle' })
        setMotion({ kind: 'gone', top, under })
        latest.current.onBack(under)
        return
      }
      setMotion({ kind: 'slide', top, under, from: progress, to: back ? 1 : 0, thenBack: back })
    }
    container.addEventListener('touchstart', onStart, { passive: true })
    // not passive: a sideways drag must stop the page from scrolling
    container.addEventListener('touchmove', onMove, { passive: false })
    container.addEventListener('touchend', onEnd)
    container.addEventListener('touchcancel', onEnd)
    return () => {
      container.removeEventListener('touchstart', onStart)
      container.removeEventListener('touchmove', onMove)
      container.removeEventListener('touchend', onEnd)
      container.removeEventListener('touchcancel', onEnd)
    }
  }, [container])

  const moving = motion.kind !== 'idle'
  const stack = moving ? [motion.under, motion.top] : [path]

  return (
    <>
      {stack.map((layerPath) => {
        const isUnder = moving && layerPath === motion.under
        return (
          <div
            key={layerPath}
            data-testid="stack-layer"
            ref={(element) => {
              if (element) elements.current.layers.set(layerPath, element)
              else elements.current.layers.delete(layerPath)
            }}
            // the page below and a page sliding away can't be used; one sliding in already can
            inert={
              isUnder || motion.kind === 'gone' || (motion.kind === 'slide' && motion.to === 1)
            }
            aria-hidden={isUnder || undefined}
            className={
              moving
                ? 'absolute inset-0 overflow-hidden bg-bg will-change-transform'
                : 'min-h-full bg-bg'
            }
            style={moving && !isUnder ? { boxShadow: TOP_SHADOW } : undefined}
          >
            <div
              ref={(element) => {
                if (element) elements.current.contents.set(layerPath, element)
                else elements.current.contents.delete(layerPath)
              }}
            >
              <PagePathContext value={layerPath}>{renderPage()}</PagePathContext>
            </div>
            {isUnder && (
              <div
                ref={(element) => {
                  if (element) elements.current.shades.set(layerPath, element)
                  else elements.current.shades.delete(layerPath)
                }}
                className="pointer-events-none absolute inset-0 bg-black"
              />
            )}
          </div>
        )
      })}
    </>
  )
}
