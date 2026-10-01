import { mapNutrients, NUTRIENT_KEYS, type NutritionTotals, type NutritionValues } from './types'

/** The nutrition columns of a meal_items row. */
export type MealItemNutrition = { readonly basis_multiplier: number } & NutritionValues

export const EMPTY_TOTALS: NutritionTotals = {
  kcal: 0,
  ...mapNutrients(() => 0),
  missing: [],
}

/** Unknown nutrients count as 0 and are listed in `missing`, like the meal_totals view. */
export function itemTotals(item: MealItemNutrition): NutritionTotals {
  const multiplier = item.basis_multiplier
  return {
    kcal: item.kcal * multiplier,
    ...mapNutrients((key) => (item[key] ?? 0) * multiplier),
    missing: NUTRIENT_KEYS.filter((key) => item[key] === null),
  }
}

export function sumTotals(totals: readonly NutritionTotals[]): NutritionTotals {
  return totals.reduce<NutritionTotals>(
    (sum, next) => ({
      kcal: sum.kcal + next.kcal,
      ...mapNutrients((key) => sum[key] + next[key]),
      missing: NUTRIENT_KEYS.filter(
        (key) => sum.missing.includes(key) || next.missing.includes(key),
      ),
    }),
    EMPTY_TOTALS,
  )
}

export function mealTotals(items: readonly MealItemNutrition[]): NutritionTotals {
  return sumTotals(items.map(itemTotals))
}
