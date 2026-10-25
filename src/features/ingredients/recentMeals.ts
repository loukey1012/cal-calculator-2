import type { Dish, Eater } from '../dishes/portions'
import { buildMealItem, type MealItemDraft, type MealItemSource } from '../nutrition/fromIngredient'
import { addDays } from '../trends/trends'

/**
 * Editing an ingredient also updates the food logged with it in the last two weeks (today and the
 * 13 days before), for both people. Older meals keep the values they were logged with.
 */
const RECENT_DAYS = 14

/** The first day whose meals take an ingredient's new values. */
export function recentWindowStart(today: string): string {
  return addDays(today, -(RECENT_DAYS - 1))
}

/**
 * The logged food rebuilt from the ingredient as it is now, for the same amount and unit; null
 * when that amount can't be measured any more (e.g. units, but the unit weight was removed).
 */
export function refreshedItem(item: MealItemDraft, source: MealItemSource): MealItemDraft | null {
  try {
    return buildMealItem(source, item.entered_amount, item.entered_unit)
  } catch {
    return null
  }
}

/** The dish with the ingredient's lines rebuilt; null when it has no such line to change. */
export function refreshedDish(
  dish: Dish,
  ingredientId: string,
  source: MealItemSource,
): Dish | null {
  const lines = dish.lines.map((line) => {
    if (line.item.ingredient_id !== ingredientId) return line
    const item = refreshedItem(line.item, source)
    return item ? { ...line, item } : line
  })
  const changed = lines.some((line, index) => line !== dish.lines[index])
  return changed ? { ...dish, lines } : null
}

/** Each meal once (a meal is one person's breakfast, lunch, … on one day). */
export function mealsTouched(meals: readonly Eater[]): readonly Eater[] {
  const byKey = new Map(meals.map((meal) => [`${meal.userId}|${meal.date}|${meal.mealType}`, meal]))
  return [...byKey.values()]
}

/** The note after saving; null when no recent meal had the ingredient. */
export function updatedMealsMessage(count: number): string | null {
  if (count === 0) return null
  return `Updated in ${count} ${count === 1 ? 'meal' : 'meals'}`
}
