type SegmentOption<T extends string> = { readonly value: T; readonly label: string }

type SegmentedControlProps<T extends string> = {
  readonly label: string
  readonly options: readonly SegmentOption<T>[]
  readonly value: T
  readonly onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-2xl bg-track p-1">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`min-h-10 flex-1 rounded-xl px-2 text-[14px] font-bold transition-colors ${
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
