import { useLayoutEffect, useState, type RefObject } from 'react'

// the counter row under the text area, plus a little air above the keyboard
const BELOW_FIELD_PX = 40
const MIN_FIELD_HEIGHT_PX = 120
// a visual viewport shorter than the layout viewport by more than this means the keyboard is open
const KEYBOARD_MIN_PX = 120

/**
 * The layout space below the visible viewport that the standalone app compensates for
 * (--viewport-shortfall, see index.css) and the home-indicator inset. Custom properties with
 * calc() can't be read as numbers, so a probe element is measured.
 */
function measureScreenEdge(): { shortfall: number; safeBottom: number } {
  const probe = document.createElement('div')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;width:0;height:var(--viewport-shortfall,0px);padding-bottom:env(safe-area-inset-bottom,0px)'
  document.body.appendChild(probe)
  const safeBottom = Number.parseFloat(getComputedStyle(probe).paddingBottom)
  const total = probe.getBoundingClientRect().height
  probe.remove()
  const safe = Number.isFinite(safeBottom) ? safeBottom : 0
  return { shortfall: Math.max(0, total - safe) || 0, safeBottom: safe }
}

/** The bottom edge, in viewport coordinates, that the text area may reach. */
function usableBottom(): number {
  const viewport = window.visualViewport
  if (viewport && window.innerHeight - viewport.height > KEYBOARD_MIN_PX) {
    return viewport.offsetTop + viewport.height
  }
  const { shortfall, safeBottom } = measureScreenEdge()
  return window.innerHeight + shortfall - safeBottom
}

/** The text area fills the page down to the keyboard, or down to the screen edge without it. */
export function useNoteFieldHeight(field: RefObject<HTMLTextAreaElement | null>): number {
  const [height, setHeight] = useState(MIN_FIELD_HEIGHT_PX)
  useLayoutEffect(() => {
    const element = field.current
    if (!element) return
    const viewport = window.visualViewport
    const update = () => {
      const room = usableBottom() - element.getBoundingClientRect().top - BELOW_FIELD_PX
      const next = Math.max(MIN_FIELD_HEIGHT_PX, Math.floor(room))
      setHeight((current) => (current === next ? current : next))
    }
    update()
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [field])
  return height
}
