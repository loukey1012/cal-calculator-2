import { fetchDishes, saveDish } from '../dishes/dishesApi'
import { newRevision } from '../dishes/hooks'
import type { Eater } from '../dishes/portions'
import { ingredientSource } from '../nutrition/fromIngredient'
import type { Ingredient } from './ingredientsApi'
import { mealsTouched, refreshedDish, refreshedItem } from './recentMeals'
import { fetchRecentDishIds, fetchRecentItems, updateItemValues } from './recentMealsApi'

/**
 * Gives the food logged with an edited ingredient on `since` or later its new values: plain food
 * directly, dishes as a new revision (so every portion is logged again). Returns the meals that
 * changed.
 */
export async function applyToRecentMeals(
  ingredient: Ingredient,
  since: string,
): Promise<readonly Eater[]> {
  const source = ingredientSource(ingredient)
  const [items, dishIds] = await Promise.all([
    fetchRecentItems(ingredient.id, since),
    fetchRecentDishIds(ingredient.id, since),
  ])

  const itemChanges = items.flatMap(({ id, item, meal }) => {
    const values = refreshedItem(item, source)
    return values ? [{ id, values, meal }] : []
  })
  await Promise.all(itemChanges.map(({ id, values }) => updateItemValues(id, values)))

  const dishes = dishIds.length > 0 ? await fetchDishes(dishIds) : []
  const dishChanges = dishes.flatMap((dish) => {
    const refreshed = refreshedDish(dish, ingredient.id, source)
    return refreshed ? [{ base: dish, dish: { ...refreshed, revision: newRevision() } }] : []
  })
  await Promise.all(
    dishChanges.map(({ base, dish }) =>
      saveDish({ dish, baseRevision: base.revision, replaceItemIds: [] }),
    ),
  )

  return mealsTouched([
    ...itemChanges.map(({ meal }) => meal),
    ...dishChanges.flatMap(({ dish }) => dish.portions.flatMap(({ eater }) => eater ?? [])),
  ])
}
