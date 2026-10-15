import type { Enums } from '../../lib/database.types'

/**
 * Optional nutrients, in the order of a nutrition label (fat, of which saturates, carbohydrate,
 * of which sugars, fibre, protein, salt). Calories (kcal) are always present.
 */
export const NUTRIENT_KEYS = [
  'fat',
  'sat_fat',
  'carbs',
  'sugar',
  'fiber',
  'protein',
  'salt',
] as const

export type NutrientKey = (typeof NUTRIENT_KEYS)[number]
export type AmountUnit = Enums<'amount_unit'>
export type NutritionBasis = Enums<'nutrition_basis'>
/** What an ingredient is measured in; per_100g then means per 100 of it (g or ml). */
export type Measure = Enums<'ingredient_measure'>

export type NutrientRecord<T> = { readonly [K in NutrientKey]: T }

/** null = unknown, which is different from zero. */
export type NutrientValues = NutrientRecord<number | null>

/** Values for one basis (per 100 g or per unit). */
export type NutritionValues = { readonly kcal: number } & NutrientValues

export type IngredientNutrition = {
  /** grams when left out; for ml, per100g is per 100 ml and unitWeightG the ml per unit */
  readonly measure?: Measure
  readonly per100g: NutritionValues | null
  readonly perUnit: NutritionValues | null
  readonly unitWeightG: number | null
}

/**
 * Summed amounts; `missing` lists nutrients some item had no value for (total is a lower bound);
 * `estimated`: some food came from a dish whose calories are only roughly known.
 */
export type NutritionTotals = { readonly kcal: number } & NutrientRecord<number> & {
    readonly missing: readonly NutrientKey[]
    readonly estimated: boolean
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
