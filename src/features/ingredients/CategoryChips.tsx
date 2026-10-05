import type { CategoryLayout } from '../appearance/appearance'
import type { Category } from './ingredientsApi'

type CategoryChipsProps = {
  readonly layout: CategoryLayout
  readonly categories: readonly Category[]
  readonly selectedId: string | null
  readonly onSelect: (categoryId: string | null) => void
}

const LAYOUT_CLASSES: Record<CategoryLayout, { readonly group: string; readonly chip: string }> = {
  // one row that scrolls sideways, running to the screen edges
  line: {
    group: 'no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1',
    chip: 'min-h-9 shrink-0 px-4 text-[14px]',
  },
  // slimmer chips wrapping into rows, so every category is on screen at once
  wrap: {
    group: 'mt-3 flex flex-wrap gap-1.5',
    chip: 'min-h-8 px-3 text-[13px]',
  },
}

/** Filter chips for the ingredient categories, with "All" first. */
export function CategoryChips({ layout, categories, selectedId, onSelect }: CategoryChipsProps) {
  const chips = [{ id: null, name: 'All' }, ...categories]
  const classes = LAYOUT_CLASSES[layout]
  return (
    <div
      role="group"
      aria-label="Categories"
      // horizontal scrolling in the line must not switch tabs
      data-swipe-lock={layout === 'line' ? '' : undefined}
      className={classes.group}
    >
      {chips.map((chip) => {
        const selected = chip.id === selectedId
        return (
          <button
            key={chip.id ?? 'all'}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(chip.id)}
            className={`${classes.chip} rounded-full font-bold ${
              selected ? 'bg-accent text-on-accent' : 'bg-bg-elevated text-label shadow-card'
            }`}
          >
            {chip.name}
          </button>
        )
      })}
    </div>
  )
}
