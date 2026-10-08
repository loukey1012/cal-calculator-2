import type { ReactNode } from 'react'
import { CHIP_KEY_ATTRIBUTE } from './usePackedOrder'

type FilterChipProps = {
  /** identifies the chip when its width is measured (see usePackedOrder) */
  readonly chipKey: string
  readonly selected: boolean
  readonly onClick: () => void
  /** size and spacing, e.g. the slim chips of the wrapped layouts */
  readonly className: string
  /** set for chips that open more chips */
  readonly expanded?: boolean
  readonly children: ReactNode
}

/** A rounded filter chip: accent-filled while selected. */
export function FilterChip({
  chipKey,
  selected,
  onClick,
  className,
  expanded,
  children,
}: FilterChipProps) {
  return (
    <button
      {...{ [CHIP_KEY_ATTRIBUTE]: chipKey }}
      type="button"
      aria-pressed={selected}
      aria-expanded={expanded}
      onClick={onClick}
      className={`${className} rounded-full font-bold ${
        selected ? 'accent-edge bg-accent text-on-accent' : 'bg-bg-elevated text-label shadow-card'
      }`}
    >
      {children}
    </button>
  )
}
