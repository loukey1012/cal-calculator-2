import type { CategoryLayout } from '../appearance/appearance'
import { CategoryChips } from './CategoryChips'
import { GroupedCategoryChips } from './GroupedCategoryChips'
import type { Category, CategoryGroup } from './ingredientsApi'
import { ALL_CATEGORIES, chipGroups, groupOfFilter, type CategoryFilter } from './listing'

type CategoryFilterChipsProps = {
  readonly layout: CategoryLayout
  readonly categories: readonly Category[]
  readonly groups: readonly CategoryGroup[]
  readonly filter: CategoryFilter
  readonly onChange: (filter: CategoryFilter) => void
}

/**
 * The category filter of the Ingredients page, in the user's chosen layout: broad categories
 * first, then the categories of the picked one.
 */
export function CategoryFilterChips({
  layout,
  categories,
  groups,
  filter,
  onChange,
}: CategoryFilterChipsProps) {
  const chips = chipGroups(groups, categories)
  if (layout === 'grouped') {
    return <GroupedCategoryChips groups={chips} filter={filter} onChange={onChange} />
  }
  // a picked broad category takes the place of the others, followed by its categories
  const open = groupOfFilter(chips, filter)
  return (
    <CategoryChips
      layout={layout}
      items={open ? [open, ...open.categories] : chips}
      selectedId={filter.kind === 'all' ? null : filter.id}
      onSelect={(id) => {
        if (id === null) onChange(ALL_CATEGORIES)
        else if (chips.some((group) => group.id === id)) onChange({ kind: 'group', id })
        else onChange({ kind: 'category', id })
      }}
    />
  )
}
