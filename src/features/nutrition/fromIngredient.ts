import type { Tables } from '../../lib/database.types'
import { roundTo } from '../../lib/numbers'
import { resolveAmount } from './amounts'
import { toWholeKcal } from './format'
import {
  mapNutrients,
  type AmountUnit,
  type IngredientNutrition,
  type NutrientValues,
  type NutritionBasis,
  type NutritionValues,
} from './types'

// matches meal_items.entered_amount numeric(9, 2)
const AMOUNT_DECIMALS = 2

type IngredientRow = Tables<'ingredients'>

/** Insert-ready meal_items columns, minus meal_id (set when the meal is known). */
export type MealItemDraft = {
  readonly ingredient_id: string | null
  readonly name: string
  readonly brand: string | null
  readonly entered_amount: number
  readonly entered_unit: AmountUnit
  readonly basis: NutritionBasis
  readonly basis_multiplier: number
  readonly kcal: number
} & NutrientValues

export type MealItemSource = {
  /** null for a custom one-off item that isn't in the ingredient database */
  readonly ingredientId: string | null
  readonly name: string
  readonly brand: string | null
  readonly nutrition: IngredientNutrition
}

function basisFromRow(row: IngredientRow, suffix: '100' | 'unit'): NutritionValues | null {
  const kcal = row[`kcal_${suffix}`]
  if (kcal === null) return null
  return { kcal, ...mapNutrients((key) => row[`${key}_${suffix}`]) }
}

export function ingredientNutrition(row: IngredientRow): IngredientNutrition {
  return {
    per100g: basisFromRow(row, '100'),
    perUnit: basisFromRow(row, 'unit'),
    unitWeightG: row.unit_weight_g,
  }
}

/** Snapshots the nutrition of the basis used, so later ingredient edits never rewrite history. */
export function buildMealItem(
  source: MealItemSource,
  amount: number,
  unit: AmountUnit,
): MealItemDraft {
  const { basis, multiplier, values } = resolveAmount(source.nutrition, amount, unit)
  return {
    ingredient_id: source.ingredientId,
    name: source.name,
    brand: source.brand,
    entered_amount: roundTo(amount, AMOUNT_DECIMALS),
    entered_unit: unit,
    basis,
    basis_multiplier: multiplier,
    ...values,
    kcal: toWholeKcal(values.kcal),
  }
}
