import { useState } from 'react'
import { Button } from '../../components/ios/Button'
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

/**
 * The preset colors as round buttons, and a last one for any color (the system color picker).
 * A custom color is only previewed while picking and saved with "Use this color": iOS reports
 * colors while the finger moves, and saving each would close its picker mid-move.
 */
export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const current = value.toLowerCase()
  const [draft, setDraft] = useState(current)
  const [shownValue, setShownValue] = useState(current)
  // a new saved color (e.g. a preset tapped) drops an unused custom one
  if (current !== shownValue) {
    setShownValue(current)
    setDraft(current)
  }
  const isCustom = !COLOR_PRESETS.some((preset) => preset.value === current)
  const hasUnsavedDraft = draft !== current

  return (
    <div className="rounded-3xl bg-bg-elevated p-4 shadow-card">
      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-6 justify-items-center gap-3"
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
        <CustomColor
          draft={draft}
          selected={isCustom || hasUnsavedDraft}
          onDraft={(color) => setDraft(color.toLowerCase())}
        />
      </div>
      {hasUnsavedDraft && (
        <div className="mt-4 flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`h-11 w-11 shrink-0 rounded-full ${isNearWhite(draft) ? EDGE : ''}`}
            style={{ backgroundColor: draft }}
          />
          <Button className="flex-1" onClick={() => onChange(draft)}>
            Use this color
          </Button>
        </div>
      )}
    </div>
  )
}

type CustomColorProps = {
  readonly draft: string
  readonly selected: boolean
  readonly onDraft: (color: string) => void
}

/** A rainbow circle (or the custom color) over the system color picker, which stays open. */
function CustomColor({ draft, selected, onDraft }: CustomColorProps) {
  return (
    <span
      data-testid="custom-color"
      data-selected={selected}
      className={`relative grid h-11 w-11 place-items-center rounded-full ${selected ? SELECTED : ''}`}
      style={{ background: RAINBOW }}
    >
      {selected && (
        <span
          className={`h-7 w-7 rounded-full ${isNearWhite(draft) ? EDGE : ''}`}
          style={{ backgroundColor: draft }}
        />
      )}
      <input
        type="color"
        aria-label="Custom color"
        value={draft}
        // React's onChange also gets the colors reported while the finger moves
        onChange={(event) => onDraft(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0"
      />
    </span>
  )
}
