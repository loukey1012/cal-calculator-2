type SegmentOption<T extends string> = { readonly value: T; readonly label: string }

type SegmentedControlProps<T extends string> = {
  readonly label: string
  readonly options: readonly SegmentOption<T>[]
  readonly value: T
  readonly onChange: (value: T) => void
  /** while the current value is unknown (still loading), nothing can be picked */
  readonly disabled?: boolean
  /** id of a text explaining the choices */
  readonly describedBy?: string
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  describedBy,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-describedby={describedBy}
      className="glass-surface flex gap-1 rounded-2xl bg-track p-1"
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`min-h-10 disabled:opacity-50 flex-1 rounded-xl px-1 py-1 text-center text-[13px] leading-tight font-bold transition-colors ${
              selected ? 'bg-segment-selected text-label shadow-sm' : 'text-label-secondary'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
