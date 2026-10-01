import { useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react'

const ACTION_WIDTH_PX = 80
const OPEN_THRESHOLD_PX = ACTION_WIDTH_PX / 2
// movement below this is a tap with finger jitter, not a swipe
const DRAG_THRESHOLD_PX = 4

type SwipeableRowProps = {
  readonly children: ReactNode
  readonly onDelete: () => void
  readonly deleteLabel?: string
}

type Drag = { readonly startX: number; readonly startOffset: number; readonly moved: boolean }

function clampOffset(offset: number): number {
  return Math.min(0, Math.max(-ACTION_WIDTH_PX, offset))
}

/**
 * Swipe left to reveal Delete. Only use inside sheets: `data-swipe-lock` stops the
 * tab carousel from also reacting, so on tab pages it would block tab swiping.
 */
export function SwipeableRow({ children, onDelete, deleteLabel = 'Delete' }: SwipeableRowProps) {
  const drag = useRef<Drag | null>(null)
  // a mouse/trackpad drag still ends in a click on whatever is under the pointer
  const suppressNextClick = useRef(false)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const open = offset === -ACTION_WIDTH_PX

  const offsetFor = (event: PointerEvent, from: Drag) =>
    clampOffset(from.startOffset + event.clientX - from.startX)

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    suppressNextClick.current = false
    drag.current = { startX: event.clientX, startOffset: offset, moved: false }
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current
    if (!current) return
    if (!current.moved && Math.abs(event.clientX - current.startX) < DRAG_THRESHOLD_PX) return
    drag.current = { ...current, moved: true }
    setDragging(true)
    setOffset(offsetFor(event, current))
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current
    drag.current = null
    if (!current?.moved) return
    suppressNextClick.current = true
    setDragging(false)
    setOffset(offsetFor(event, current) < -OPEN_THRESHOLD_PX ? -ACTION_WIDTH_PX : 0)
  }

  function swallowClickAfterDrag(event: MouseEvent<HTMLDivElement>) {
    if (!suppressNextClick.current) return
    suppressNextClick.current = false
    event.stopPropagation()
    event.preventDefault()
  }

  return (
    <div
      data-testid="swipeable-row"
      data-swipe-lock=""
      data-state={open ? 'open' : 'closed'}
      className="relative touch-pan-y overflow-hidden"
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={swallowClickAfterDrag}
    >
      <button
        type="button"
        onClick={onDelete}
        onFocus={() => setOffset(-ACTION_WIDTH_PX)}
        className="absolute inset-y-0 right-0 w-20 bg-destructive text-[15px] font-medium text-white"
      >
        {deleteLabel}
      </button>
      <div
        className={`relative bg-bg-elevated ${dragging ? '' : 'transition-transform duration-200'}`}
        style={{ transform: `translateX(${offset}px)` }}
      >
        {children}
      </div>
    </div>
  )
}
