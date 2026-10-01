import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import type { MealItemDraft } from '../nutrition/fromIngredient'
import {
  withItemAdded,
  withItemRemoved,
  withItemUpdated,
  type AmountPatch,
  type DayMeal,
  type MealItem,
  type MealType,
} from './dayModel'
import { addMealItem, deleteMealItem, fetchDay, updateMealItem } from './mealsApi'

export const dayKeys = {
  day: (userId: string, date: string) => ['day', userId, date] as const,
}

export function useDay(userId: string, date: string): UseQueryResult<DayMeal[]> {
  return useQuery({ queryKey: dayKeys.day(userId, date), queryFn: () => fetchDay(userId, date) })
}

type Rollback = { readonly previous: DayMeal[] | undefined }

/**
 * Applies a change to the cached day at once and saves it in the background.
 * - Changes to one day reach the server one after another (`scope`), so e.g. deleting an item
 *   right after adding it can't overtake the add. The optimistic update still happens at once.
 * - A failed change restores the old day only if nothing else is pending for that day, since the
 *   snapshot would also erase later changes; otherwise the final re-fetch sets things right.
 * - The server's version (and partner edits) win via a re-fetch once the last change is done.
 */
function useOptimisticDayMutation<TInput>(
  userId: string,
  date: string,
  save: (input: TInput) => Promise<void>,
  applyLocally: (meals: readonly DayMeal[], input: TInput) => DayMeal[],
): UseMutationResult<void, Error, TInput, Rollback> {
  const queryClient = useQueryClient()
  const queryKey = dayKeys.day(userId, date)
  const isOnlyPendingChange = () => queryClient.isMutating({ mutationKey: queryKey }) <= 1
  return useMutation({
    mutationKey: queryKey,
    scope: { id: queryKey.join(':') },
    mutationFn: (input: TInput) => save(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<DayMeal[]>(queryKey)
      queryClient.setQueryData<DayMeal[]>(queryKey, applyLocally(previous ?? [], input))
      return { previous }
    },
    onError: (_error, _input, rollback) => {
      if (isOnlyPendingChange()) queryClient.setQueryData(queryKey, rollback?.previous)
    },
    onSettled: () => {
      if (isOnlyPendingChange()) return queryClient.invalidateQueries({ queryKey })
    },
  })
}

/**
 * The error of the most recent change to a day, or null once a later change succeeded.
 * Read from the mutation cache, so it survives the meal sheet being closed.
 */
export function useLatestDayChangeError(userId: string, date: string): Error | null {
  const changes = useMutationState({
    filters: { mutationKey: dayKeys.day(userId, date) },
    select: (mutation) => mutation.state,
  })
  const latest = changes.at(-1)
  return latest?.status === 'error' ? latest.error : null
}

export type NewMealItem = {
  /** from `newMealItemId()`, part of the input so a retry reuses it */
  readonly id: string
  readonly mealType: MealType
  readonly draft: MealItemDraft
}

export function newMealItemId(): string {
  return crypto.randomUUID()
}

function optimisticItem({ id, draft }: NewMealItem): MealItem {
  const now = new Date().toISOString()
  return { ...draft, id, meal_id: '', created_at: now, updated_at: now }
}

export function useAddMealItem(userId: string, date: string) {
  return useOptimisticDayMutation(
    userId,
    date,
    (input: NewMealItem) => addMealItem({ ...input, userId, date }),
    (meals, input) => withItemAdded(meals, input.mealType, optimisticItem(input)),
  )
}

export type MealItemAmountChange = { readonly id: string; readonly patch: AmountPatch }

export function useUpdateMealItem(userId: string, date: string) {
  return useOptimisticDayMutation(
    userId,
    date,
    ({ id, patch }: MealItemAmountChange) => updateMealItem(id, patch),
    (meals, { id, patch }) => withItemUpdated(meals, id, patch),
  )
}

export function useDeleteMealItem(userId: string, date: string) {
  return useOptimisticDayMutation(
    userId,
    date,
    (id: string) => deleteMealItem(id),
    (meals, id) => withItemRemoved(meals, id),
  )
}
