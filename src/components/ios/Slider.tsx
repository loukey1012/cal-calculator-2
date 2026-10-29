import { useId, useState } from 'react'

type SliderProps = {
  readonly label: string
  readonly min: number
  readonly max: number
  readonly step?: number
  readonly value: number
  /** shown next to the label, e.g. "50%" */
  readonly format?: (value: number) => string
  /** a line under the slider, read out with it */
  readonly description?: string
  /** called once the slider is let go (or changed with the keyboard), not on every step */
  readonly onChange: (value: number) => void
}

/** A labelled slider; it saves when let go, so dragging doesn't send a change per step. */
export function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  format,
  description,
  onChange,
}: SliderProps) {
  const id = useId()
  const [dragged, setDragged] = useState<number | null>(null)
  const shown = dragged ?? value
  const descriptionId = `${id}-description`

  function commit() {
    if (dragged !== null && dragged !== value) onChange(dragged)
    setDragged(null)
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[17px]">
          {label}
        </label>
        <span className="text-[15px] font-semibold text-label-secondary">
          {format ? format(shown) : shown}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={shown}
        aria-valuetext={format?.(shown)}
        aria-describedby={description ? descriptionId : undefined}
        onChange={(event) => setDragged(Number(event.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        // sideways drags move the thumb, never the tabs or the page
        data-swipe-lock=""
        className="w-full accent-(--accent)"
      />
      {description && (
        <p id={descriptionId} className="text-[13px] text-label-secondary">
          {description}
        </p>
      )}
    </div>
  )
}
