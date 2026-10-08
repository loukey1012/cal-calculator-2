import type { QueryClient } from '@tanstack/react-query'
import { monthKeys } from '../history/hooks'
import { dayChangeKey, QUEUED_CHANGE_OPTIONS } from '../meals/dayChanges'
import { withItemAdded, type DayMeal, type MealItem } from '../meals/dayModel'
import { deleteDish, saveDish } from './dishesApi'
import { isLeftover, portionItems, type Dish, type PortionItem } from './portions'

/** One person's day. */
export type DayRef = { readonly userId: string; readonly date: string }

/**
 * One change to a dish. Like a DayChange it carries everything needed to send it and to refresh
 * what it touched, so it can be queued offline and still be sent after the app was closed.
 */
export type DishChange =
  | {
      readonly kind: 'save'
      /** the whole dish, with the new revision */
      readonly dish: Dish
      readonly baseRevision: string | null
      /** portions of the version being replaced: their meal items go away */
      readonly previousPortionIds: readonly string[]
      readonly replaceItemIds: readonly string[]
      /** every day whose meals change */
      readonly days: readonly DayRef[]
    }
  | {
      readonly kind: 'delete'
      readonly dishId: string
      readonly previousPortionIds: readonly string[]
      readonly days: readonly DayRef[]
    }

/** Mutation key of every dish change (the dish query is `dishKey`). */
export const DISH_CHANGES_KEY = ['dish'] as const

export function dishKey(dishId: string) {
  return ['dish', dishId] as const
}

/** Query key of the household's dishes with leftovers. */
export const LEFTOVERS_KEY = ['leftovers'] as const

export function dishIdOf(change: DishChange): string {
  return change.kind === 'save' ? change.dish.id : change.dishId
}

export async function applyDishChange(change: DishChange): Promise<void> {
  switch (change.kind) {
    case 'save':
      return saveDish({
        dish: change.dish,
        baseRevision: change.baseRevision,
        replaceItemIds: change.replaceItemIds,
      })
    case 'delete':
      return deleteDish(change.dishId)
  }
}

function eatenDays(dish: Dish | null): DayRef[] {
  return (dish?.portions ?? []).flatMap(({ eater }) =>
    eater ? [{ userId: eater.userId, date: eater.date }] : [],
  )
}

/** Days whose meals a change from `before` to `after` touches, each once. */
export function affectedDays(
  before: Dish | null,
  after: Dish | null,
  replacedDay: DayRef | null,
): DayRef[] {
  const all = [...eatenDays(before), ...eatenDays(after), ...(replacedDay ? [replacedDay] : [])]
  return all.filter(
    (day, index) =>
      all.findIndex((other) => other.userId === day.userId && other.date === day.date) === index,
  )
}

function optimisticItem(dish: Dish, portionId: string, { lineId, draft }: PortionItem): MealItem {
  const now = new Date().toISOString()
  return {
    ...draft,
    // replaced by the server's id on the next fetch
    id: `${portionId}:${lineId}`,
    meal_id: '',
    dish_portion_id: portionId,
    dish_line_id: lineId,
    dish: {
      id: dish.id,
      name: dish.name,
      portionCount: dish.portions.length,
      eaterCount: dish.portions.filter((portion) => portion.eater !== null).length,
      kcalEstimated: dish.kcalEstimated ?? false,
    },
    created_at: now,
    updated_at: now,
  }
}

/** The change applied to one cached day, so it shows before the server has it. */
export function applyDishChangeToDay(
  meals: readonly DayMeal[],
  change: DishChange,
  day: DayRef,
): DayMeal[] {
  const isSave = change.kind === 'save'
  const removedPortions = new Set([
    ...change.previousPortionIds,
    ...(isSave ? change.dish.portions.map((portion) => portion.id) : []),
  ])
  const replacedItems = new Set(isSave ? change.replaceItemIds : [])
  const cleared = meals.map((meal) => ({
    ...meal,
    meal_items: meal.meal_items.filter(
      (item) =>
        !replacedItems.has(item.id) &&
        !(item.dish_portion_id !== null && removedPortions.has(item.dish_portion_id)),
    ),
  }))
  if (!isSave) return cleared

  return portionItems(change.dish).reduce<DayMeal[]>((current, { portionId, eater, items }) => {
    if (!eater || eater.userId !== day.userId || eater.date !== day.date) return current
    return items.reduce<DayMeal[]>(
      (withItems, item) =>
        withItemAdded(withItems, eater.mealType, optimisticItem(change.dish, portionId, item)),
      current,
    )
  }, cleared)
}

/** The change applied to the cached leftovers: a dish is listed while it has a leftover. */
export function applyDishChangeToLeftovers(dishes: readonly Dish[], change: DishChange): Dish[] {
  const others = dishes.filter((dish) => dish.id !== dishIdOf(change))
  if (change.kind === 'delete' || !change.dish.portions.some(isLeftover)) return others
  const listed = dishes.some((dish) => dish.id === change.dish.id)
  return listed
    ? dishes.map((dish) => (dish.id === change.dish.id ? change.dish : dish))
    : [...dishes, change.dish]
}

/** After a change: load the dish, every touched day and those people's months again. */
export function refreshAfterDishChange(
  queryClient: QueryClient,
  change: DishChange,
): Promise<unknown> {
  const userIds = [...new Set(change.days.map((day) => day.userId))]
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: dishKey(dishIdOf(change)) }),
    queryClient.invalidateQueries({ queryKey: LEFTOVERS_KEY }),
    ...change.days.map((day) =>
      queryClient.invalidateQueries({ queryKey: dayChangeKey(day.userId, day.date) }),
    ),
    ...userIds.map((userId) =>
      queryClient.invalidateQueries({ queryKey: monthKeys.person(userId) }),
    ),
  ])
}

/** Lets dish changes restored from the phone's storage be sent; they lost their handlers. */
export function registerDishChangeDefaults(queryClient: QueryClient): void {
  queryClient.setMutationDefaults(DISH_CHANGES_KEY, {
    mutationFn: (change: DishChange) => applyDishChange(change),
    ...QUEUED_CHANGE_OPTIONS,
    onSettled: (_data, _error, change: DishChange) => refreshAfterDishChange(queryClient, change),
  })
}
