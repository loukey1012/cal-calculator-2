import { newDish, newId } from '../dishes/dishDraft'
import type { Dish, Eater } from '../dishes/portions'
import { itemDraftOf } from '../nutrition/fromIngredient'
import { mealEntries, type MealItem } from './dayModel'

/**
 * A meal copied to another day, meal or person: each dish (or single food) becomes a new dish
 * eaten by `eater` alone, with exactly the logged amounts and values (no current ingredient
 * values), so the copy shows what was eaten.
 */
export function copiedDishes(items: readonly MealItem[], eater: Eater): Dish[] {
  return mealEntries(items).map((entry) => {
    const entryItems = entry.kind === 'dish' ? entry.items : [entry.item]
    const ref = entryItems.find((item) => item.dish)?.dish
    return {
      ...newDish([eater]),
      name: entry.kind === 'dish' ? (ref?.name ?? null) : null,
      kcalEstimated: ref?.kcalEstimated ?? false,
      lines: entryItems.map((item) => ({
        id: newId(),
        allocation: 'shared',
        item: itemDraftOf(item),
        amounts: {},
      })),
    }
  })
}
