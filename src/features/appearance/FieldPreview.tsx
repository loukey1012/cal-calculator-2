import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { fieldBackground, type Spot } from './glassField'

const KEY_STEP = 0.05
const ARROWS: Record<string, readonly [number, number]> = {
  ArrowLeft: [-KEY_STEP, 0],
  ArrowRight: [KEY_STEP, 0],
  ArrowUp: [0, -KEY_STEP],
  ArrowDown: [0, KEY_STEP],
}

const clampShare = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 100) / 100

type FieldPreviewProps = {
  readonly spots: readonly Spot[]
  readonly strength: number
  /** custom spots can be moved by dragging them or with the arrow keys */
  readonly onMove?: (index: number, x: number, y: number) => void
}

/** A small screen showing the background; with `onMove` each spot has a handle to move it. */
export function FieldPreview({ spots, strength, onMove }: FieldPreviewProps) {
  const frame = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<{ index: number; x: number; y: number } | null>(null)
  const shown = spots.map((spot, index) =>
    dragging?.index === index ? { ...spot, x: dragging.x, y: dragging.y } : spot,
  )

  function positionOf(event: PointerEvent<HTMLElement>): { x: number; y: number } {
    const rect = frame.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0.5, y: 0.5 }
    return {
      x: clampShare((event.clientX - rect.left) / rect.width),
      y: clampShare((event.clientY - rect.top) / rect.height),
    }
  }

  function handleKey(index: number, event: KeyboardEvent<HTMLButtonElement>) {
    const move = ARROWS[event.key]
    const spot = spots[index]
    if (!move || !spot || !onMove) return
    event.preventDefault()
    onMove(index, clampShare(spot.x + move[0]), clampShare(spot.y + move[1]))
  }

  return (
    <div
      ref={frame}
      data-testid="field-preview"
      className="relative h-56 touch-none overflow-hidden rounded-3xl shadow-card"
      style={{ background: fieldBackground(shown, strength) }}
    >
      {onMove &&
        shown.map((spot, index) => (
          <button
            // spots have no ids; their order is their identity while editing
            key={index}
            type="button"
            aria-label={`Move spot ${index + 1}`}
            onKeyDown={(event) => handleKey(index, event)}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              setDragging({ index, ...positionOf(event) })
            }}
            onPointerMove={(event) => {
              if (dragging?.index === index) setDragging({ index, ...positionOf(event) })
            }}
            onPointerUp={() => {
              if (dragging?.index === index) onMove(index, dragging.x, dragging.y)
              setDragging(null)
            }}
            className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-card"
            style={{
              left: `${spot.x * 100}%`,
              top: `${spot.y * 100}%`,
              backgroundColor: spot.color,
            }}
          />
        ))}
    </div>
  )
}
