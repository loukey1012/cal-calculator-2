import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { LEFTOVERS_KEY } from '../dishes/dishChanges'
import type { Eater } from '../dishes/portions'
import { monthKeys } from '../history/hooks'
import { dayChangeKey } from '../meals/dayChanges'
import { applyToRecentMeals } from './applyToRecentMeals'
import type { Ingredient } from './ingredientsApi'

export type ApplyToRecentMealsInput = { readonly ingredient: Ingredient; readonly since: string }

/** Gives recent meals an edited ingredient's values, then refreshes the days it changed. */
export function useApplyToRecentMeals(): UseMutationResult<
  readonly Eater[],
  Error,
  ApplyToRecentMealsInput
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ingredient, since }) => applyToRecentMeals(ingredient, since),
    onSuccess: (meals) =>
      Promise.all([
        ...meals.flatMap(({ userId, date }) => [
          queryClient.invalidateQueries({ queryKey: dayChangeKey(userId, date) }),
          queryClient.invalidateQueries({ queryKey: monthKeys.person(userId) }),
        ]),
        queryClient.invalidateQueries({ queryKey: LEFTOVERS_KEY }),
      ]),
  })
}
