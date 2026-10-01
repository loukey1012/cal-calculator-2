import { resolveAmount } from '../nutrition/amounts'
import { toWholeKcal } from '../nutrition/format'
import { itemTotals } from '../nutrition/totals'
import type { AmountUnit, IngredientNutrition, NutritionTotals } from '../nutrition/types'
import { scaleItemAmount, type MealItem } from './dayModel'

/** What adding `amount` of something would contribute; null when the amount can't be logged. */
export function previewNewItem(
  nutrition: IngredientNutrition,
  amount: number,
  unit: AmountUnit,
): NutritionTotals | null {
  try {
    const { multiplier, values } = resolveAmount(nutrition, amount, unit)
    return itemTotals({ ...values, kcal: toWholeKcal(values.kcal), basis_multiplier: multiplier })
  } catch {
    return null
  }
}

/** What a logged item would contribute with a new amount; null when it can't be stored. */
export function previewChangedItem(item: MealItem, amount: number): NutritionTotals | null {
  try {
    return itemTotals({ ...item, ...scaleItemAmount(item, amount) })
  } catch {
    return null
  }
}
