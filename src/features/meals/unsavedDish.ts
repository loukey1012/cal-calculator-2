import { draftEaterIds, hasContent, type AddFoodDraft } from '../addFood/addFoodDraft'
import type { MealType } from './dayModel'
import type { MealRef } from './mealPages'

/**
 * Whether a dish being put together (not logged yet) is for this meal: started, eaten by its
 * person, on its day and at it. Day and meal follow today and the time of day until chosen.
 */
export function isDraftFor(
  draft: AddFoodDraft,
  meal: MealRef,
  today: string,
  mealOfDay: MealType,
): boolean {
  return (
    hasContent(draft) &&
    draftEaterIds(draft).includes(meal.userId) &&
    (draft.date ?? today) === meal.date &&
    (draft.mealType ?? mealOfDay) === meal.mealType
  )
}
