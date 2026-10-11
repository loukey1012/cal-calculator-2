import type { Ingredient } from './ingredientsApi'
import { useAppearanceSettings } from '../appearance/useAppearanceSettings'
import { useIngredientUses } from './hooks'
import { sortIngredients, type IngredientSort } from './sorting'

/** The account's order for both ingredient lists, how to change it, and how to apply it. */
export function useIngredientSort(householdId: string) {
  const { appearance, change } = useAppearanceSettings()
  const sort = appearance.ingredientSort
  // only "Most used" needs the counts
  const uses = useIngredientUses(householdId, sort === 'used')
  return {
    sort,
    setSort: (next: IngredientSort) => change('ingredientSort', next),
    sorted: (ingredients: readonly Ingredient[]) =>
      sortIngredients(ingredients, sort, uses.data ?? {}),
  }
}
