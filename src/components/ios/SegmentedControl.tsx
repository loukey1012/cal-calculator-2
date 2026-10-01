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
    <div role="radiogroup" aria-label={label} className="flex rounded-[9px] bg-fill p-0.5">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-[7px] py-1.5 text-[13px] font-semibold text-label transition-colors ${
              selected ? 'bg-bg-elevated shadow-sm' : ''
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
