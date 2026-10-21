import type { CategoryLayout } from '../appearance/appearance'
import { FilterChip } from './FilterChip'
import { arrange, usePackedOrder } from './usePackedOrder'

/** a broad category or a category: chips only need its id and name */
type ChipItem = { readonly id: string; readonly name: string }

type CategoryChipsProps = {
  readonly layout: FlatLayout
  readonly items: readonly ChipItem[]
  readonly selectedId: string | null
  /** null = "All" */
  readonly onSelect: (id: string | null) => void
}

/** the wrapped layouts: slimmer chips flowing into rows */
export const WRAPPED_ROW_CLASSES = 'flex flex-wrap gap-1.5'
export const SLIM_CHIP_CLASSES = 'min-h-8 px-3 text-[13px]'

type FlatLayout = Exclude<CategoryLayout, 'grouped'>

const LAYOUT_CLASSES: Record<FlatLayout, { readonly group: string; readonly chip: string }> = {
  // one row that scrolls sideways, running to the screen edges
  line: {
    group: 'no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1',
    chip: 'min-h-9 shrink-0 px-4 text-[14px]',
  },
  // slimmer chips wrapping into rows, so every category is on screen at once
  wrap: {
    group: `mt-3 ${WRAPPED_ROW_CLASSES}`,
    chip: SLIM_CHIP_CLASSES,
  },
}

const ALL_KEY = 'all'

/** Filter chips in one line or wrapped, with "All" first. */
export function CategoryChips({ layout, items, selectedId, onSelect }: CategoryChipsProps) {
  const chips = [{ id: null, name: 'All' }, ...items]
  const classes = LAYOUT_CLASSES[layout]
  const keyOf = (chip: { readonly id: string | null }) => chip.id ?? ALL_KEY
  // the line scrolls, so only the wrapped chips are rearranged to fill fewer rows
  const { ref, order } = usePackedOrder<HTMLDivElement>(chips.map(keyOf), layout === 'wrap')
  return (
    <div
      ref={ref}
      role="group"
      aria-label="Categories"
      // horizontal scrolling in the line must not switch tabs
      data-swipe-lock={layout === 'line' ? '' : undefined}
      className={classes.group}
    >
      {arrange(chips, keyOf, order).map((chip) => (
        <FilterChip
          key={keyOf(chip)}
          chipKey={keyOf(chip)}
          selected={chip.id === selectedId}
          onClick={() => onSelect(chip.id)}
          className={classes.chip}
        >
          {chip.name}
        </FilterChip>
      ))}
    </div>
  )
}
