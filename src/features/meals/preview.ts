import { itemTotals } from '../nutrition/totals'
import type { NutritionTotals } from '../nutrition/types'
import { scaleItemAmount, type MealItem } from './dayModel'

/** What a logged item would contribute with a new amount; null when it can't be stored. */
export function previewChangedItem(item: MealItem, amount: number): NutritionTotals | null {
  try {
    return itemTotals({ ...item, ...scaleItemAmount(item, amount) })
  } catch {
    return null
  }
}
