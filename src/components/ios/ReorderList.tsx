import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { ReorderIcon } from './icons'
import { moveItem, targetIndex } from './reorder'

type ReorderListProps<T> = {
  readonly items: readonly T[]
  readonly getKey: (item: T) => string
  /** names the row's handle ("Move <label>") and the spoken result */
  readonly getLabel: (item: T) => string
  readonly renderRow: (item: T) => ReactNode
  /** the new order, once per move: when a drag is let go, or after an arrow key */
  readonly onReorder: (next: T[]) => void
}

type Drag = {
  /** the dragged row, by key: the list may change while a finger is down */
  readonly key: string
  readonly pointerId: number
  readonly startY: number
  readonly rowHeight: number
  readonly offset: number
}

/** The order handed to the parent, shown until the parent's own list has changed. */
type Pending<T> = { readonly base: readonly T[]; readonly order: readonly T[] }

type Status = { readonly message: string; readonly flip: boolean }

const HINT = 'Drag to move, or use the arrow keys.'
// makes a repeated message a new text, so a screen reader says it again
const ZERO_WIDTH_SPACE = '​'
const SR_MOVE_BUTTON = 'sr-only'

/** The transform of row `index` while row `from` is dragged over the others. */
function rowTransform(
  index: number,
  from: number,
  drag: Drag | null,
  count: number,
): string | undefined {
  if (!drag || from < 0) return undefined
  const { rowHeight, offset } = drag
  if (index === from) {
    const clamped = Math.min((count - 1 - from) * rowHeight, Math.max(-from * rowHeight, offset))
    return `translateY(${clamped}px)`
  }
  const target = targetIndex(from, offset, rowHeight, count)
  if (from < target && index > from && index <= target) return `translateY(-${rowHeight}px)`
  if (from > target && index < from && index >= target) return `translateY(${rowHeight}px)`
  return undefined
}

/**
 * Rows of equal height that are put in order by their handle (iOS style): the dragged row
 * follows the finger, the others slide aside, and the order is reported once on release.
 */
export function ReorderList<T>({
  items,
  getKey,
  getLabel,
  renderRow,
  onReorder,
}: ReorderListProps<T>) {
  const hintId = useId()
  const [drag, setDrag] = useState<Drag | null>(null)
  const [pending, setPending] = useState<Pending<T> | null>(null)
  // the render that puts the new order in place must not animate the rows
  const [settling, setSettling] = useState(false)
  const [status, setStatus] = useState<Status>({ message: '', flip: false })
  const handles = useRef(new Map<string, HTMLButtonElement>())
  // a moved row's handle keeps the focus even if the browser dropped it while moving the node
  const refocusKey = useRef<string | null>(null)
  const [refocusRequest, setRefocusRequest] = useState(0)

  const shown = pending && pending.base === items ? pending.order : items

  useLayoutEffect(() => {
    if (refocusKey.current) handles.current.get(refocusKey.current)?.focus()
    refocusKey.current = null
  }, [refocusRequest])

  useEffect(() => {
    if (!settling) return
    const frame = requestAnimationFrame(() => setSettling(false))
    return () => cancelAnimationFrame(frame)
  }, [settling])

  const dragFrom = drag ? shown.findIndex((item) => getKey(item) === drag.key) : -1
  const activeDrag = dragFrom >= 0 ? drag : null

  function commit(from: number, to: number) {
    const item = shown[from]
    if (!item || from === to) return
    const next = moveItem(shown, from, to)
    refocusKey.current = getKey(item)
    setRefocusRequest((count) => count + 1)
    setSettling(true)
    setPending({ base: items, order: next })
    setStatus((current) => ({
      message: `${getLabel(item)} moved to position ${to + 1} of ${shown.length}`,
      flip: !current.flip,
    }))
    onReorder(next)
  }

  function start(event: PointerEvent<HTMLButtonElement>, key: string) {
    if (drag || event.button !== 0) return
    const rowHeight = event.currentTarget
      .closest('[role="listitem"]')
      ?.getBoundingClientRect().height
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId)
    } catch {
      // the pointer is already gone: the drag then ends with its pointerup or cancel
    }
    setDrag({
      key,
      pointerId: event.pointerId,
      startY: event.clientY,
      rowHeight: rowHeight ?? 0,
      offset: 0,
    })
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    if (!drag || event.pointerId !== drag.pointerId) return
    const offset = event.clientY - drag.startY
    setDrag((current) => (current && current.offset !== offset ? { ...current, offset } : current))
  }

  function release(event: PointerEvent<HTMLButtonElement>) {
    if (!drag || event.pointerId !== drag.pointerId) return
    setDrag(null)
    if (dragFrom < 0) return
    const offset = event.clientY - drag.startY
    commit(dragFrom, targetIndex(dragFrom, offset, drag.rowHeight, shown.length))
  }

  function cancel(event: PointerEvent<HTMLButtonElement>) {
    if (drag && event.pointerId === drag.pointerId) setDrag(null)
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, from: number) {
    if (event.key === 'Escape' && drag) {
      event.preventDefault()
      setDrag(null)
      return
    }
    const step = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
    if (step === 0) return
    event.preventDefault()
    if (from + step >= 0 && from + step < shown.length) commit(from, from + step)
  }

  return (
    <div>
      <div role="list" className="divide-y divide-separator">
        {shown.map((item, index) => {
          const key = getKey(item)
          const label = getLabel(item)
          const dragged = activeDrag?.key === key
          const animated = !dragged && !settling
          return (
            <div
              key={key}
              role="listitem"
              style={{ transform: rowTransform(index, dragFrom, activeDrag, shown.length) }}
              className={`glass-solid relative flex items-center bg-bg-elevated ${
                dragged
                  ? 'z-10 bg-[linear-gradient(var(--fill),var(--fill))] shadow-bar ring-1 ring-separator'
                  : ''
              } ${animated ? 'motion-safe:transition-transform motion-safe:duration-150' : ''}`}
            >
              <div className="min-w-0 flex-1">{renderRow(item)}</div>
              {index > 0 && (
                <button
                  type="button"
                  className={SR_MOVE_BUTTON}
                  onClick={() => commit(index, index - 1)}
                >
                  {`Move ${label} up`}
                </button>
              )}
              {index < shown.length - 1 && (
                <button
                  type="button"
                  className={SR_MOVE_BUTTON}
                  onClick={() => commit(index, index + 1)}
                >
                  {`Move ${label} down`}
                </button>
              )}
              <button
                type="button"
                ref={(node) => {
                  if (node) handles.current.set(key, node)
                  else handles.current.delete(key)
                }}
                aria-label={`Move ${label}`}
                aria-describedby={hintId}
                data-swipe-lock=""
                onPointerDown={(event) => start(event, key)}
                onPointerMove={move}
                onPointerUp={release}
                onPointerCancel={cancel}
                onLostPointerCapture={cancel}
                onContextMenu={(event) => event.preventDefault()}
                onKeyDown={(event) => onKeyDown(event, index)}
                className="flex h-12 w-12 shrink-0 cursor-grab touch-none items-center justify-center text-label-secondary [-webkit-touch-callout:none] select-none"
              >
                <ReorderIcon className="h-5 w-5" />
              </button>
            </div>
          )
        })}
      </div>
      <p id={hintId} className="sr-only">
        {HINT}
      </p>
      <p role="status" className="sr-only">
        {status.message && status.message + (status.flip ? ZERO_WIDTH_SPACE : '')}
      </p>
    </div>
  )
}
