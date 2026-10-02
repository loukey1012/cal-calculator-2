import type { QueryClient } from '@tanstack/react-query'
import { isNetworkError } from '../../lib/errors'
import { monthKeys } from '../history/hooks'
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
import { addMealItem, deleteMealItem, updateMealItem } from './mealsApi'

/**
 * One change to a user's day. It carries everything needed to send it, so a change queued
 * offline can still be sent after the app was closed (it's stored on the phone, see persistence.ts).
 */
export type DayChange =
  | {
      readonly kind: 'add'
      readonly userId: string
      readonly date: string
      /** generated on the phone: resending the same add can never create a duplicate */
      readonly id: string
      readonly mealType: MealType
      readonly draft: MealItemDraft
    }
  | {
      readonly kind: 'update'
      readonly userId: string
      readonly date: string
      readonly id: string
      readonly patch: AmountPatch
    }
  | { readonly kind: 'delete'; readonly userId: string; readonly date: string; readonly id: string }

/** Prefix of every day change's mutation key. */
export const DAY_CHANGES_KEY = ['day'] as const
const FIRST_RETRY_DELAY_MS = 1000
const MAX_RETRY_DELAY_MS = 30_000

export function dayChangeKey(userId: string, date: string) {
  return [...DAY_CHANGES_KEY, userId, date] as const
}

export async function applyDayChange(change: DayChange): Promise<void> {
  switch (change.kind) {
    case 'add':
      return addMealItem({
        id: change.id,
        userId: change.userId,
        date: change.date,
        mealType: change.mealType,
        draft: change.draft,
      })
    case 'update':
      return updateMealItem(change.id, change.patch)
    case 'delete':
      return deleteMealItem(change.id)
  }
}

function optimisticItem(id: string, draft: MealItemDraft): MealItem {
  const now = new Date().toISOString()
  return { ...draft, id, meal_id: '', created_at: now, updated_at: now }
}

/** The same change applied to the cached day, so it shows before the server has it. */
export function applyDayChangeLocally(meals: readonly DayMeal[], change: DayChange): DayMeal[] {
  switch (change.kind) {
    case 'add':
      return withItemAdded(meals, change.mealType, optimisticItem(change.id, change.draft))
    case 'update':
      return withItemUpdated(meals, change.id, change.patch)
    case 'delete':
      return withItemRemoved(meals, change.id)
  }
}

/**
 * A change is never given up because of the connection: iOS can report "online" on a dead or
 * captive network, so failed requests are retried until they get through (safe, since every
 * change is idempotent). Only a real server rejection fails the change and rolls it back.
 */
export function retryNetworkErrors(_failureCount: number, error: Error): boolean {
  return isNetworkError(error)
}

export function retryDelayFor(failureCount: number): number {
  return Math.min(FIRST_RETRY_DELAY_MS * 2 ** failureCount, MAX_RETRY_DELAY_MS)
}

export const DAY_CHANGE_OPTIONS = {
  // wait (paused) while offline and send when the connection is back
  networkMode: 'online',
  retry: retryNetworkErrors,
  retryDelay: retryDelayFor,
} as const

/** Lets changes restored from the phone's storage be sent; they lost their in-memory handlers. */
export function registerDayChangeDefaults(queryClient: QueryClient): void {
  queryClient.setMutationDefaults(DAY_CHANGES_KEY, {
    mutationFn: (change: DayChange) => applyDayChange(change),
    ...DAY_CHANGE_OPTIONS,
    // restored changes have no optimistic handlers: show the server's version of their day after
    onSettled: (_data, _error, change: DayChange) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: dayChangeKey(change.userId, change.date) }),
        queryClient.invalidateQueries({ queryKey: monthKeys.person(change.userId) }),
      ]),
  })
}
