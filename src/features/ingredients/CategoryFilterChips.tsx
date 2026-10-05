import type { CategoryLayout } from '../appearance/appearance'
import { CategoryChips } from './CategoryChips'
import { GroupedCategoryChips } from './GroupedCategoryChips'
import type { Category, CategoryGroup, Ingredient } from './ingredientsApi'
import { ALL_CATEGORIES, chipGroups, type CategoryFilter } from './listing'

type CategoryFilterChipsProps = {
  readonly layout: CategoryLayout
  readonly categories: readonly Category[]
  readonly groups: readonly CategoryGroup[]
  readonly ingredients: readonly Ingredient[]
  readonly filter: CategoryFilter
  readonly onChange: (filter: CategoryFilter) => void
}

/** The category filter of the Ingredients page, in the user's chosen layout. */
export function CategoryFilterChips({
  layout,
  categories,
  groups,
  ingredients,
  filter,
  onChange,
}: CategoryFilterChipsProps) {
  if (layout === 'grouped') {
    return (
      <GroupedCategoryChips
        groups={chipGroups(groups, categories, ingredients)}
        filter={filter}
        onChange={onChange}
      />
    )
  }
  return (
    <CategoryChips
      layout={layout}
      categories={categories}
      // a broad category picked in the grouped layout shows as "All" here
      selectedId={filter.kind === 'category' ? filter.id : null}
      onSelect={(id) => onChange(id === null ? ALL_CATEGORIES : { kind: 'category', id })}
    />
  )
}
