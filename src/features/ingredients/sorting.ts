import type { Ingredient } from './ingredientsApi'

/** The orders both ingredient lists can be shown in (saved to the account). */
export const INGREDIENT_SORTS = ['newest', 'name', 'used', 'kcal'] as const
export type IngredientSort = (typeof INGREDIENT_SORTS)[number]

export const INGREDIENT_SORT_OPTIONS: readonly {
  readonly value: IngredientSort
  readonly label: string
  readonly hint: string
}[] = [
  { value: 'newest', label: 'Newest first', hint: 'The latest added on top' },
  { value: 'name', label: 'A–Z', hint: 'By category, then by name' },
  { value: 'used', label: 'Most used', hint: 'In dishes and logged food' },
  { value: 'kcal', label: 'Fewest calories', hint: 'Per 100 g or ml; per unit only ones after' },
]

/** How often each ingredient was used, by ingredient id; unused ones are missing. */
type IngredientUses = Readonly<Record<string, number>>

type Compare = (a: Ingredient, b: Ingredient) => number

const byName: Compare = (a, b) => a.name.localeCompare(b.name)

// ISO timestamps compare as text; an ingredient without one counts as the oldest
const byNewest: Compare = (a, b) => b.created_at.localeCompare(a.created_at)

/** ascending, a missing value after every present one */
function byValue(value: (ingredient: Ingredient) => number | null): Compare {
  return (a, b) => {
    const left = value(a)
    const right = value(b)
    if (left === null || right === null) return Number(left === null) - Number(right === null)
    return left - right
  }
}

function comparerFor(sort: IngredientSort, uses: IngredientUses): Compare {
  switch (sort) {
    case 'newest':
      return byNewest
    case 'name':
      return byName
    case 'used':
      return (a, b) => (uses[b.id] ?? 0) - (uses[a.id] ?? 0)
    case 'kcal': {
      const per100 = byValue((ingredient) => ingredient.kcal_100)
      const perUnit = byValue((ingredient) => ingredient.kcal_unit)
      return (a, b) => per100(a, b) || perUnit(a, b)
    }
  }
}

/** A sorted copy; ingredients the order can't tell apart are by name. */
export function sortIngredients(
  ingredients: readonly Ingredient[],
  sort: IngredientSort,
  uses: IngredientUses,
): Ingredient[] {
  const compare = comparerFor(sort, uses)
  return ingredients.toSorted((a, b) => compare(a, b) || byName(a, b))
}
