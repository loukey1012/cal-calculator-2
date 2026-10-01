import type { Enums } from '../../lib/database.types'

/** Optional nutrients, in display order. Calories (kcal) are always present. */
export const NUTRIENT_KEYS = [
  'protein',
  'carbs',
  'sugar',
  'fat',
  'sat_fat',
  'fiber',
  'salt',
] as const

export type NutrientKey = (typeof NUTRIENT_KEYS)[number]
export type AmountUnit = Enums<'amount_unit'>
export type NutritionBasis = Enums<'nutrition_basis'>

export type NutrientRecord<T> = { readonly [K in NutrientKey]: T }

/** null = unknown, which is different from zero. */
export type NutrientValues = NutrientRecord<number | null>

/** Values for one basis (per 100 g or per unit). */
export type NutritionValues = { readonly kcal: number } & NutrientValues

export type IngredientNutrition = {
  readonly per100g: NutritionValues | null
  readonly perUnit: NutritionValues | null
  readonly unitWeightG: number | null
}

/** Summed amounts; `missing` lists nutrients some item had no value for (total is a lower bound). */
export type NutritionTotals = { readonly kcal: number } & NutrientRecord<number> & {
    readonly missing: readonly NutrientKey[]
  }

export function mapNutrients<T>(pick: (key: NutrientKey) => T): NutrientRecord<T> {
  return {
    protein: pick('protein'),
    carbs: pick('carbs'),
    sugar: pick('sugar'),
    fat: pick('fat'),
    sat_fat: pick('sat_fat'),
    fiber: pick('fiber'),
    salt: pick('salt'),
  }
}
