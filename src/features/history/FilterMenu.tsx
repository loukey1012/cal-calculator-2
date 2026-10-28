import { useState } from 'react'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { CheckIcon, FilterIcon } from '../../components/ios/icons'
import { ListRow } from '../../components/ios/ListRow'
import { Sheet } from '../../components/ios/Sheet'
import { MONTH_FILTERS, type MonthFilter } from './monthStats'

const SHOW_ALL_LABEL = 'Show all'

type FilterMenuProps = {
  readonly filter: MonthFilter | null
  /** the chosen filter, or null when the active one was picked again (or Show all) */
  readonly onChange: (filter: MonthFilter | null) => void
}

/** One filter at a time: the calendar fades the days that don't match it. */
export function FilterMenu({ filter, onChange }: FilterMenuProps) {
  const [open, setOpen] = useState(false)
  const activeLabel = MONTH_FILTERS.find(({ value }) => value === filter)?.label

  function choose(next: MonthFilter | null) {
    onChange(next)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        aria-label={activeLabel ? `Filter: ${activeLabel}` : 'Filter'}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full active:opacity-60 ${
          filter === null ? 'text-label-secondary' : 'bg-accent-soft text-accent-ink'
        }`}
      >
        <FilterIcon className="h-5 w-5" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Highlight days">
        <GroupedSection footer="The other days of the month fade.">
          <ListRow
            title={SHOW_ALL_LABEL}
            detail={filter === null ? <CheckIcon className="h-5 w-5 text-accent-ink" /> : null}
            ariaLabel={filter === null ? `${SHOW_ALL_LABEL}, selected` : undefined}
            hideChevron
            onClick={() => choose(null)}
          />
          {MONTH_FILTERS.map(({ value, label }) => (
            <ListRow
              key={value}
              title={label}
              detail={filter === value ? <CheckIcon className="h-5 w-5 text-accent-ink" /> : null}
              ariaLabel={filter === value ? `${label}, selected` : undefined}
              hideChevron
              onClick={() => choose(filter === value ? null : value)}
            />
          ))}
        </GroupedSection>
      </Sheet>
    </>
  )
}
