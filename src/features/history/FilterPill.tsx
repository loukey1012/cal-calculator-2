import { MONTH_FILTERS, type MonthFilter } from './monthStats'

type FilterPillProps = {
  readonly filter: MonthFilter | null
  readonly onClear: () => void
}

/** Says which days are highlighted (the others fade) and clears it; nothing without a filter. */
export function FilterPill({ filter, onClear }: FilterPillProps) {
  if (filter === null) return null
  const label = MONTH_FILTERS.find(({ value }) => value === filter)?.label ?? ''
  return (
    <div className="mt-3 flex">
      <p className="flex items-center gap-2 rounded-full bg-accent-soft py-1 pr-1 pl-3 text-[13px] font-semibold text-accent-ink">
        <span>{`${label} highlighted`}</span>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          onClick={onClear}
          // the ::after reaches a 44 px touch target without making the pill tall
          className="relative rounded-full px-2 py-0.5 font-bold after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] active:opacity-60"
        >
          Clear
        </button>
      </p>
    </div>
  )
}
