import { FilterChip } from '../ingredients/FilterChip'
import { MONTH_FILTERS, type MonthFilter } from './monthStats'

type MonthFilterChipsProps = {
  readonly filter: MonthFilter | null
  /** the chosen filter, or null when the active chip was tapped again */
  readonly onChange: (filter: MonthFilter | null) => void
}

/** One filter at a time: the calendar fades the days that don't match it. */
export function MonthFilterChips({ filter, onChange }: MonthFilterChipsProps) {
  return (
    <div role="group" aria-label="Highlight days" className="mt-3 flex flex-wrap gap-2">
      {MONTH_FILTERS.map(({ value, label }) => (
        <FilterChip
          key={value}
          chipKey={value}
          selected={filter === value}
          onClick={() => onChange(filter === value ? null : value)}
          className="px-3.5 py-1.5 text-[14px]"
        >
          {label}
        </FilterChip>
      ))}
    </div>
  )
}
