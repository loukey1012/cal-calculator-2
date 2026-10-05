import type { ReactNode } from 'react'

type FilterChipProps = {
  readonly selected: boolean
  readonly onClick: () => void
  /** size and spacing, e.g. the slim chips of the wrapped layouts */
  readonly className: string
  /** set for chips that open more chips */
  readonly expanded?: boolean
  readonly children: ReactNode
}

/** A rounded filter chip: accent-filled while selected. */
export function FilterChip({ selected, onClick, className, expanded, children }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-expanded={expanded}
      onClick={onClick}
      className={`${className} rounded-full font-bold ${
        selected ? 'bg-accent text-on-accent' : 'bg-bg-elevated text-label shadow-card'
      }`}
    >
      {children}
    </button>
  )
}
