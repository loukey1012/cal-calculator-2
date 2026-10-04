import type { ReactNode } from 'react'

const SELECTED_RING = 'ring-2 ring-accent ring-offset-2 ring-offset-bg'

type Swatch = { readonly name: string; readonly value: string }

type SwatchPickerProps = {
  readonly label: string
  readonly swatches: readonly Swatch[]
  readonly value: string
  readonly onChange: (value: string) => void
}

/** Round color buttons, e.g. the accent color. */
export function SwatchPicker({ label, swatches, value, onChange }: SwatchPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid grid-cols-6 justify-items-center gap-3 rounded-3xl bg-bg-elevated p-4 shadow-card"
    >
      {swatches.map((swatch) => {
        const selected = swatch.value === value.toLowerCase()
        return (
          <button
            key={swatch.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={swatch.name}
            onClick={() => onChange(swatch.value)}
            className={`h-11 w-11 rounded-full ${selected ? 'ring-2 ring-label ring-offset-2 ring-offset-bg-elevated' : ''}`}
            style={{ backgroundColor: swatch.value }}
          />
        )
      })}
    </div>
  )
}

type OptionCard<T extends string> = {
  readonly value: T
  readonly label: string
  readonly description?: string
  /** small visual sample shown above the label */
  readonly preview: ReactNode
}

type OptionCardsProps<T extends string> = {
  readonly label: string
  readonly options: readonly OptionCard<T>[]
  readonly value: T
  readonly onChange: (value: T) => void
}

/** A two-column grid of choices that each show a small sample. */
export function OptionCards<T extends string>({
  label,
  options,
  value,
  onChange,
}: OptionCardsProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-3">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`flex flex-col gap-2.5 rounded-[20px] bg-bg-elevated p-3 text-left shadow-card ${
              selected ? SELECTED_RING : ''
            }`}
          >
            {option.preview}
            <span className="px-1">
              <span className="block text-[15px] font-bold">{option.label}</span>
              {option.description && (
                <span className="block text-[12px] font-medium text-label-secondary">
                  {option.description}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

type SettingSectionProps = {
  readonly title: string
  readonly footer?: string
  readonly children: ReactNode
}

export function SettingSection({ title, footer, children }: SettingSectionProps) {
  return (
    <section className="mt-6">
      <h2 className="caption px-1 pb-2">{title}</h2>
      {children}
      {footer && <p className="px-1 pt-2 text-[13px] text-label-secondary">{footer}</p>}
    </section>
  )
}
