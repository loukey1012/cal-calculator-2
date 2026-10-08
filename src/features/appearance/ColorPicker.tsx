import { useEffect, useRef } from 'react'
import { isNearWhite } from '../../lib/color'
import { COLOR_PRESETS } from './colorPresets'

type ColorPickerProps = {
  readonly label: string
  /** #rrggbb */
  readonly value: string
  readonly onChange: (value: string) => void
}

// white on a white card needs an edge to be seen
const EDGE = 'shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.14)]'
const SELECTED = 'ring-2 ring-label ring-offset-2 ring-offset-bg-elevated'
const RAINBOW =
  'conic-gradient(#e5484d, #f5c400, #30a46c, #0797b9, #007aff, #8e4ec6, #d6409f, #e5484d)'

/** The preset colors as round buttons, and a last one for any color (the system color picker). */
export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const current = value.toLowerCase()
  const isCustom = !COLOR_PRESETS.some((preset) => preset.value === current)

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid grid-cols-6 justify-items-center gap-3 rounded-3xl bg-bg-elevated p-4 shadow-card"
    >
      {COLOR_PRESETS.map((preset) => {
        const selected = preset.value === current
        return (
          <button
            key={preset.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={preset.name}
            onClick={() => onChange(preset.value)}
            className={`h-11 w-11 rounded-full ${isNearWhite(preset.value) ? EDGE : ''} ${selected ? SELECTED : ''}`}
            style={{ backgroundColor: preset.value }}
          />
        )
      })}
      <CustomColor value={current} selected={isCustom} onChange={onChange} />
    </div>
  )
}

type CustomColorProps = {
  readonly value: string
  readonly selected: boolean
  readonly onChange: (value: string) => void
}

/**
 * A rainbow circle (or the custom color, once chosen) over the system color picker. The color is
 * used when the picker closes (`change`), not on every move while choosing (`input`).
 */
function CustomColor({ value, selected, onChange }: CustomColorProps) {
  const input = useRef<HTMLInputElement>(null)
  const latestOnChange = useRef(onChange)

  useEffect(() => {
    latestOnChange.current = onChange
  })

  useEffect(() => {
    const element = input.current
    if (!element) return
    const onPicked = () => latestOnChange.current(element.value.toLowerCase())
    element.addEventListener('change', onPicked)
    return () => element.removeEventListener('change', onPicked)
    // the input is a new element whenever the value changes (its key)
  }, [value])

  return (
    <span
      data-testid="custom-color"
      data-selected={selected}
      className={`relative grid h-11 w-11 place-items-center rounded-full ${selected ? SELECTED : ''}`}
      style={{ background: RAINBOW }}
    >
      {selected && (
        <span
          className={`h-7 w-7 rounded-full ${isNearWhite(value) ? EDGE : ''}`}
          style={{ backgroundColor: value }}
        />
      )}
      <input
        ref={input}
        type="color"
        aria-label="Custom color"
        // uncontrolled: a remount (new key) shows a newly saved color
        key={value}
        defaultValue={value}
        className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0"
      />
    </span>
  )
}
