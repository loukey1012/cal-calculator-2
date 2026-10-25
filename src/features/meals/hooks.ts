import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type QueryKey,
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
import { noteOf, type AmountPatch, type DayMeal, type MealType } from './dayModel'
import { fetchDay, fetchCheatDay, fetchDayNote } from './mealsApi'

const dayKeys = {
  day: (userId: string, date: string) => ['day', userId, date] as const,
  // under the day's key, so everything that refreshes the day refreshes the mark too
  cheatDay: (userId: string, date: string) => ['day', userId, date, 'cheatDay'] as const,
  dayNote: (userId: string, date: string) => ['day', userId, date, 'note'] as const,
}

export function useDay(userId: string, date: string): UseQueryResult<DayMeal[]> {
  return useQuery({ queryKey: dayKeys.day(userId, date), queryFn: () => fetchDay(userId, date) })
}

/** Whether the day is a cheat day. */
export function useCheatDay(userId: string, date: string): UseQueryResult<boolean> {
  return useQuery({
    queryKey: dayKeys.cheatDay(userId, date),
    queryFn: () => fetchCheatDay(userId, date),
  })
}

/** The day's note, or null. */
export function useDayNote(userId: string, date: string): UseQueryResult<string | null> {
  return useQuery({
    queryKey: dayKeys.dayNote(userId, date),
    queryFn: () => fetchDayNote(userId, date),
  })
}

type Rollback = { readonly previous: unknown }
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
  return useCachedDayChange<DayMeal[]>(userId, date, dayKeys.day(userId, date), (meals, change) =>
    applyDayChangeLocally(meals ?? [], change),
  )
}

/** Like useDayChange, for a change shown in another cached query of the day. */
function useCachedDayChange<TCached>(
  userId: string,
  date: string,
  queryKey: QueryKey,
  applyLocally: (cached: TCached | undefined, change: DayChange) => TCached,
): DayChangeMutation {
  const queryClient = useQueryClient()
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
      const previous = queryClient.getQueryData<TCached>(queryKey)
      queryClient.setQueryData<TCached>(queryKey, applyLocally(previous, change))
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

type MealItemAmountChange = { readonly id: string; readonly patch: AmountPatch }

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

type CheatMealChange = { readonly mealType: MealType; readonly cheatMeal: boolean }

/** Marks a meal of the day as a cheat meal, or takes the mark back. */
export function useSetCheatMeal(userId: string, date: string): DayChangeActions<CheatMealChange> {
  const change = useDayChange(userId, date)
  return {
    ...change,
    mutate: (input) => change.mutate({ kind: 'cheatMeal', userId, date, ...input }),
  }
}

/** Marks the day as a cheat day, or takes the mark back. */
export function useSetCheatDay(userId: string, date: string): DayChangeActions<boolean> {
  const change = useCachedDayChange<boolean>(
    userId,
    date,
    dayKeys.cheatDay(userId, date),
    (cached, next) => (next.kind === 'cheatDay' ? next.cheatDay : (cached ?? false)),
  )
  return {
    ...change,
    mutate: (cheatDay) => change.mutate({ kind: 'cheatDay', userId, date, cheatDay }),
  }
}

type MealNoteChange = { readonly mealType: MealType; readonly note: string }

/** Sets a meal's note, or removes it when empty. */
export function useSetMealNote(userId: string, date: string): DayChangeActions<MealNoteChange> {
  const change = useDayChange(userId, date)
  return {
    ...change,
    mutate: (input) => change.mutate({ kind: 'mealNote', userId, date, ...input }),
  }
}

/** Sets the day's note, or removes it when empty. */
export function useSetDayNote(userId: string, date: string): DayChangeActions<string> {
  const change = useCachedDayChange<string | null>(
    userId,
    date,
    dayKeys.dayNote(userId, date),
    (cached, next) => (next.kind === 'dayNote' ? noteOf(next.note) : (cached ?? null)),
  )
  return {
    ...change,
    mutate: (note) => change.mutate({ kind: 'dayNote', userId, date, note }),
  }
}
