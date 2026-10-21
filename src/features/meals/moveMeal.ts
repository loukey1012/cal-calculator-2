import { useQueryClient } from '@tanstack/react-query'
import { dishKey } from '../dishes/dishChanges'
import { withPortionEater } from '../dishes/dishDraft'
import { fetchDish } from '../dishes/dishesApi'
import { useSaveDish } from '../dishes/hooks'
import type { Dish, Eater } from '../dishes/portions'
import { copiedDishes } from './copyMeal'
import { mealEntries, type MealItem } from './dayModel'
import { useDeleteMealItem } from './hooks'

/** What a move does to one entry of a meal. */
export type MoveStep =
  /** a dish (or a food logged alone): its portion is eaten elsewhere, the dish stays one */
  | { readonly kind: 'portion'; readonly dishId: string; readonly portionId: string }
  /** a plain item of an older version: copied there as a dish of its own, then deleted */
  | { readonly kind: 'copy'; readonly items: readonly MealItem[] }

export function moveSteps(items: readonly MealItem[]): MoveStep[] {
  return mealEntries(items).map((entry) => {
    const entryItems = entry.kind === 'dish' ? entry.items : [entry.item]
    const [first] = entryItems
    const dishId = first?.dish?.id
    const portionId = first?.dish_portion_id
    return dishId && portionId
      ? { kind: 'portion', dishId, portionId }
      : { kind: 'copy', items: entryItems }
  })
}

/**
 * Moves a meal's entries (or some of them) to another meal, day or person. Dishes keep their
 * id, so a dish shared with the partner keeps their portion. A dish not loaded on this phone yet
 * is fetched, so that part needs a connection.
 */
export function useMoveEntries(
  userId: string,
  date: string,
): (items: readonly MealItem[], eater: Eater) => Promise<void> {
  const queryClient = useQueryClient()
  const saveDish = useSaveDish()
  const remove = useDeleteMealItem(userId, date)
  return async (items, eater) => {
    for (const step of moveSteps(items)) {
      if (step.kind === 'copy') {
        for (const dish of copiedDishes(step.items, eater)) saveDish.save({ dish })
        for (const item of step.items) remove.mutate(item.id)
        continue
      }
      const dish = await queryClient.fetchQuery<Dish | null>({
        queryKey: dishKey(step.dishId),
        queryFn: () => fetchDish(step.dishId),
      })
      if (dish) saveDish.save({ dish: withPortionEater(dish, step.portionId, eater) })
    }
  }
}
