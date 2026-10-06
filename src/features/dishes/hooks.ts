import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import { isQueuedChange } from '../../lib/persistence'
import { dayChangeKey, MEAL_CHANGES_SCOPE, QUEUED_CHANGE_OPTIONS } from '../meals/dayChanges'
import type { DayMeal } from '../meals/dayModel'
import {
  affectedDays,
  applyDishChange,
  applyDishChangeToDay,
  dishIdOf,
  applyDishChangeToLeftovers,
  dishKey,
  DISH_CHANGES_KEY,
  LEFTOVERS_KEY,
  refreshAfterDishChange,
  type DishChange,
} from './dishChanges'
import { fetchDish, fetchLeftoverDishes } from './dishesApi'
import { portionItems, type Dish } from './portions'

/** null while no dish is selected */
export function useDish(dishId: string | null): UseQueryResult<Dish | null> {
  return useQuery({
    queryKey: dishKey(dishId ?? ''),
    queryFn: () => fetchDish(dishId ?? ''),
    enabled: dishId !== null,
  })
}

const LEFTOVER_MAX_AGE_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The household's dishes cooked in the last week that still have a leftover. Each dish is also
 * cached on its own, so taking or throwing away a leftover saves on top of this version.
 */
export function useLeftovers(): UseQueryResult<Dish[]> {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: LEFTOVERS_KEY,
    queryFn: async () => {
      const since = new Date(Date.now() - LEFTOVER_MAX_AGE_DAYS * DAY_MS).toISOString()
      const dishes = await fetchLeftoverDishes(since)
      for (const dish of dishes) queryClient.setQueryData(dishKey(dish.id), dish)
      return dishes
    },
  })
}

type Snapshot = { readonly key: QueryKey; readonly data: unknown }
type DishChangeMutation = UseMutationResult<void, Error, DishChange, readonly Snapshot[]>

function hasOtherPendingChanges(queryClient: QueryClient): boolean {
  return (
    queryClient.isMutating({
      predicate: (mutation) => isQueuedChange(mutation.options.mutationKey),
    }) > 1
  )
}

/** Puts back what was cached; what wasn't cached yet is loaded from the server instead. */
function restore(queryClient: QueryClient, snapshots: readonly Snapshot[]): void {
  for (const { key, data } of snapshots) {
    if (data === undefined) void queryClient.invalidateQueries({ queryKey: key, exact: true })
    else queryClient.setQueryData(key, data)
  }
}

/**
 * Applies a dish change to the cached dish and every touched day at once, and saves it in the
 * background through the same queue as meal changes (offline-safe, in order, see useDayChange).
 * Days that aren't loaded yet are left alone: they load complete once they are needed.
 */
function useDishChange(): DishChangeMutation {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: DISH_CHANGES_KEY,
    scope: MEAL_CHANGES_SCOPE,
    ...QUEUED_CHANGE_OPTIONS,
    mutationFn: (change: DishChange) => applyDishChange(change),
    onMutate: async (change) => {
      const dayKeys = change.days.map((day) => dayChangeKey(day.userId, day.date))
      const keys: QueryKey[] = [dishKey(dishIdOf(change)), LEFTOVERS_KEY, ...dayKeys]
      await Promise.all(keys.map((queryKey) => queryClient.cancelQueries({ queryKey })))
      const snapshots = keys.map((key) => ({ key, data: queryClient.getQueryData(key) }))

      queryClient.setQueryData(
        dishKey(dishIdOf(change)),
        change.kind === 'save' ? change.dish : null,
      )
      const leftovers = queryClient.getQueryData<Dish[]>(LEFTOVERS_KEY)
      if (leftovers) {
        queryClient.setQueryData(LEFTOVERS_KEY, applyDishChangeToLeftovers(leftovers, change))
      }
      change.days.forEach((day, index) => {
        const key = dayKeys[index]
        const meals = key && queryClient.getQueryData<DayMeal[]>(key)
        if (key && meals) queryClient.setQueryData(key, applyDishChangeToDay(meals, change, day))
      })
      return snapshots
    },
    onError: (_error, _change, snapshots) => {
      // with later changes pending, the snapshot would erase them; the final re-fetch fixes it
      if (snapshots && !hasOtherPendingChanges(queryClient)) restore(queryClient, snapshots)
    },
    onSettled: (_data, _error, change) =>
      hasOtherPendingChanges(queryClient) ? undefined : refreshAfterDishChange(queryClient, change),
  })
}

/** The error of the latest dish change, or null once a later one succeeded (survives closing). */
export function useLatestDishChangeError(): Error | null {
  const changes = useMutationState({
    filters: { mutationKey: DISH_CHANGES_KEY },
    select: (mutation) => mutation.state,
  })
  const latest = changes.at(-1)
  return latest?.status === 'error' ? latest.error : null
}

export type SaveDishRequest = {
  /** the edited dish; it gets a new revision when saved */
  readonly dish: Dish
  /**
   * The revision the edit started from. An editor names it, so a newer version that arrived
   * while editing (e.g. a partner's live update) is refused instead of overwritten.
   * Defaults to the cached version, for quick changes that start from it at once.
   */
  readonly baseRevision?: string | null
}

export function newRevision(): string {
  return crypto.randomUUID()
}

/**
 * `save` throws a RangeError (with a readable message) for a dish that can't be split, before
 * anything is queued. It saves on top of the cached version of the dish: if someone else saved
 * meanwhile, the server refuses with "changed meanwhile" and everything is restored.
 */
export function useSaveDish(): DishChangeMutation & {
  readonly save: (request: SaveDishRequest) => void
} {
  const queryClient = useQueryClient()
  const change = useDishChange()
  const save = ({ dish: edited, baseRevision }: SaveDishRequest) => {
    portionItems(edited)
    const previous = queryClient.getQueryData<Dish | null>(dishKey(edited.id)) ?? null
    const dish = { ...edited, revision: newRevision() }
    change.mutate({
      kind: 'save',
      dish,
      baseRevision: baseRevision === undefined ? (previous?.revision ?? null) : baseRevision,
      previousPortionIds: previous?.portions.map((portion) => portion.id) ?? [],
      replaceItemIds: [],
      days: affectedDays(previous, dish, null),
    })
  }
  return { ...change, save }
}

export function useDeleteDish(): DishChangeMutation & {
  readonly remove: (dishId: string) => void
} {
  const queryClient = useQueryClient()
  const change = useDishChange()
  const remove = (dishId: string) => {
    const previous = queryClient.getQueryData<Dish | null>(dishKey(dishId)) ?? null
    change.mutate({
      kind: 'delete',
      dishId,
      previousPortionIds: previous?.portions.map((portion) => portion.id) ?? [],
      days: affectedDays(previous, null, null),
    })
  }
  return { ...change, remove }
}
