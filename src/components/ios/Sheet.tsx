import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'

const DISMISS_DISTANCE_PX = 120
// index.html mount point; the sheet is portalled outside it
const APP_ROOT_ID = 'root'

type SheetProps = {
  readonly open: boolean
  readonly onClose: () => void
  readonly title: string
  readonly children: ReactNode
}

/** iOS-style bottom sheet. Rendered above the tab carousel, so its gestures never switch tabs. */
export function Sheet({ open, ...panelProps }: SheetProps) {
  return open ? <SheetPanel {...panelProps} /> : null
}

function SheetPanel({ onClose, title, children }: Omit<SheetProps, 'open'>) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)

  // modal behaviour: the app behind is inert, focus moves in and returns to the trigger on close
  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const appRoot = document.getElementById(APP_ROOT_ID)
    const previousOverflow = document.body.style.overflow
    appRoot?.setAttribute('inert', '')
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      appRoot?.removeAttribute('inert')
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    // capturing the pointer would retarget the click away from buttons in the header on iOS
    if (event.target instanceof Element && event.target.closest('button')) return
    dragStartY.current = event.clientY
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return
    setDragOffset(Math.max(0, event.clientY - dragStartY.current))
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return
    const distance = event.clientY - dragStartY.current
    dragStartY.current = null
    setDragOffset(0)
    if (distance > DISMISS_DISTANCE_PX) onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        data-testid="sheet-backdrop"
        className="absolute inset-0 animate-fade-in bg-black/40"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined}
        className="relative flex max-h-[92dvh] w-full max-w-md animate-sheet-in flex-col rounded-t-[14px] bg-bg pb-safe-bottom text-label outline-none"
      >
        <div
          data-testid="sheet-drag-handle"
          className="touch-none px-4 pt-2 pb-2"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="mx-auto h-[5px] w-9 rounded-full bg-label-secondary/40" />
          <div className="mt-2 flex items-center justify-between">
            <h2 id={titleId} className="text-[17px] font-semibold">
              {title}
            </h2>
            <Button variant="plain" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
