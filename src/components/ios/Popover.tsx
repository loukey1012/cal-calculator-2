import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** the space kept between the popover and the screen edges, and between it and its anchor */
const GUTTER_PX = 16
const ANCHOR_GAP_PX = 8

type PopoverProps = {
  readonly open: boolean
  /** the popover sits below this element (above it when there is no room below) */
  readonly anchor: HTMLElement | null
  /** the accessible name of the dialog */
  readonly label: string
  readonly onClose: () => void
  readonly children: ReactNode
}

function placeBelow(anchor: HTMLElement, popover: HTMLElement): CSSProperties {
  const rect = anchor.getBoundingClientRect()
  const { offsetWidth: width, offsetHeight: height } = popover
  const maxLeft = Math.max(GUTTER_PX, window.innerWidth - width - GUTTER_PX)
  const left = Math.min(Math.max(rect.left, GUTTER_PX), maxLeft)
  const fitsBelow = rect.bottom + ANCHOR_GAP_PX + height <= window.innerHeight - GUTTER_PX
  const fitsAbove = rect.top - ANCHOR_GAP_PX - height >= GUTTER_PX
  const top =
    fitsBelow || !fitsAbove ? rect.bottom + ANCHOR_GAP_PX : rect.top - ANCHOR_GAP_PX - height
  return { left, top }
}

/**
 * A small floating card next to a control. It is drawn in the body at a fixed position taken
 * from the anchor's rectangle, because the anchor sits inside transformed parents (the tab and
 * page slides) that would hold a fixed child to themselves. It closes with Escape or a press
 * outside it and its anchor; the focus moves in when it opens and back to the anchor when it
 * closes.
 */
export function Popover({ open, anchor, label, onClose, children }: PopoverProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  // the listeners below stay in place when the caller passes another function
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })
  const [position, setPosition] = useState<CSSProperties | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchor) return
    const place = () => {
      if (!cardRef.current) return
      const next = placeBelow(anchor, cardRef.current)
      // scrolling fires this often; a position that didn't move needs no render
      setPosition((current) =>
        current && current.left === next.left && current.top === next.top ? current : next,
      )
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, anchor])

  useEffect(() => {
    if (!open) return
    cardRef.current?.querySelector('button')?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // handled here: a card around the anchor (listening on the window) stays open
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      // the card isn't a focus trap: leaving it with Tab closes it, and the focus continues
      // from the anchor
      if (event.key === 'Tab' && cardRef.current?.contains(event.target as Node)) {
        event.preventDefault()
        anchor?.focus()
        onCloseRef.current()
      }
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element
      if (cardRef.current?.contains(target) || anchor?.contains(target)) return
      onCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
      // the card is gone now, so focus that was in it is on the body; focus the user moved to
      // something else stays there
      const active = document.activeElement
      if (!active || active === document.body) anchor?.focus()
    }
  }, [open, anchor])

  if (!open) return null
  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label={label}
      data-popover=""
      // hidden until measured, so it never flashes at the corner
      style={position ?? { left: 0, top: 0, visibility: 'hidden' }}
      className="glass-surface fixed z-40 flex min-w-48 flex-col overflow-hidden rounded-2xl bg-bg-elevated shadow-card"
    >
      {children}
    </div>,
    document.body,
  )
}
