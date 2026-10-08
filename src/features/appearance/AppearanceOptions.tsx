import type { ReactNode } from 'react'

// the readable accent: a white accent's ring would vanish on a light page
const SELECTED_RING = 'ring-2 ring-accent-ink ring-offset-2 ring-offset-bg'

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
