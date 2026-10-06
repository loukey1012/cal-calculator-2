import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import { isQueuedChange } from '../../lib/persistence'
import { monthKeys } from '../history/hooks'
import {
  applyDayChange,
  applyDayChangeLocally,
  MEAL_CHANGES_SCOPE,
  QUEUED_CHANGE_OPTIONS,
  dayChangeKey,
  type DayChange,
} from './dayChanges'
import type { AmountPatch, DayMeal } from './dayModel'
import { fetchDay } from './mealsApi'

const dayKeys = {
  day: (userId: string, date: string) => ['day', userId, date] as const,
}

export function useDay(userId: string, date: string): UseQueryResult<DayMeal[]> {
  return useQuery({ queryKey: dayKeys.day(userId, date), queryFn: () => fetchDay(userId, date) })
}

type Rollback = { readonly previous: DayMeal[] | undefined }
type DayChangeMutation = UseMutationResult<void, Error, DayChange, Rollback>

/**
 * Applies a change to the cached day at once and saves it in the background.
 * - Offline, changes wait (paused) and are sent when the connection is back; queued changes are
 *   stored on the phone, so they also survive the app being closed.
 * - All meal and dish changes reach the server one after another (`scope`), so e.g. deleting an
 *   item right after adding it can't overtake the add. The optimistic update still happens at once.
 * - A failed change restores the old day only if no other change is pending, since the snapshot
 *   would also erase later changes; otherwise the final re-fetch sets things right.
 * - The server's version (and partner edits) win via a re-fetch once the last change is done.
 */
function useDayChange(userId: string, date: string): DayChangeMutation {
  const queryClient = useQueryClient()
  const queryKey = dayKeys.day(userId, date)
  const mutationKey = dayChangeKey(userId, date)
  const isOnlyPendingChange = () =>
    queryClient.isMutating({
      predicate: (mutation) => isQueuedChange(mutation.options.mutationKey),
    }) <= 1
  return useMutation({
    mutationKey,
    scope: MEAL_CHANGES_SCOPE,
    ...QUEUED_CHANGE_OPTIONS,
    mutationFn: (change: DayChange) => applyDayChange(change),
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<DayMeal[]>(queryKey)
      queryClient.setQueryData<DayMeal[]>(queryKey, applyDayChangeLocally(previous ?? [], change))
      return { previous }
    },
    onError: (_error, _change, rollback) => {
      if (isOnlyPendingChange()) queryClient.setQueryData(queryKey, rollback?.previous)
    },
    onSettled: () => {
      if (!isOnlyPendingChange()) return
      // the History calendar shows this day's totals too
      return Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: monthKeys.person(userId) }),
      ])
    },
  })
}

/**
 * The error of the most recent change to a day, or null once a later change succeeded.
 * Read from the mutation cache, so it survives the meal sheet being closed.
 */
export function useLatestDayChangeError(userId: string, date: string): Error | null {
  const changes = useMutationState({
    filters: { mutationKey: dayChangeKey(userId, date) },
    select: (mutation) => mutation.state,
  })
  const latest = changes.at(-1)
  return latest?.status === 'error' ? latest.error : null
}

type DayChangeActions<TInput> = Omit<DayChangeMutation, 'mutate'> & {
  readonly mutate: (input: TInput) => void
}

export type MealItemAmountChange = { readonly id: string; readonly patch: AmountPatch }

export function useUpdateMealItem(
  userId: string,
  date: string,
): DayChangeActions<MealItemAmountChange> {
  const change = useDayChange(userId, date)
  return { ...change, mutate: (input) => change.mutate({ kind: 'update', userId, date, ...input }) }
}

export function useDeleteMealItem(userId: string, date: string): DayChangeActions<string> {
  const change = useDayChange(userId, date)
  return { ...change, mutate: (id) => change.mutate({ kind: 'delete', userId, date, id }) }
}
