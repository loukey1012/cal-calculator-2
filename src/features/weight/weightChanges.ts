import type { QueryClient } from '@tanstack/react-query'
import { QUEUED_CHANGE_OPTIONS } from '../meals/dayChanges'
import { withWeightRemoved, withWeightSaved, type WeightEntry } from './weight'
import { deleteWeight, saveWeight } from './weightApi'

/** A weight saved or removed; queued offline and sent in order, like meal changes. */
export type WeightChange =
  | { readonly kind: 'save'; readonly userId: string; readonly entry: WeightEntry }
  | { readonly kind: 'delete'; readonly userId: string; readonly date: string }

export const WEIGHT_CHANGES_KEY = ['weight'] as const
/** Weights don't depend on meals, so they have their own queue. */
export const WEIGHT_CHANGES_SCOPE = { id: 'weight-changes' } as const

export const weightKeys = { weights: (userId: string) => ['weights', userId] as const }

export function weightChangeKey(userId: string) {
  return [...WEIGHT_CHANGES_KEY, userId] as const
}

/** Both are safe to resend: a save replaces that day, deleting again changes nothing. */
export function applyWeightChange(change: WeightChange): Promise<void> {
  return change.kind === 'save'
    ? saveWeight(change.userId, change.entry)
    : deleteWeight(change.userId, change.date)
}

export function applyWeightChangeLocally(
  entries: readonly WeightEntry[],
  change: WeightChange,
): WeightEntry[] {
  return change.kind === 'save'
    ? withWeightSaved(entries, change.entry)
    : withWeightRemoved(entries, change.date)
}

/** Lets weight changes restored from the phone's storage be sent; they lost their handlers. */
export function registerWeightChangeDefaults(queryClient: QueryClient): void {
  queryClient.setMutationDefaults(WEIGHT_CHANGES_KEY, {
    mutationFn: (change: WeightChange) => applyWeightChange(change),
    ...QUEUED_CHANGE_OPTIONS,
    onSettled: (_data, _error, change: WeightChange) =>
      queryClient.invalidateQueries({ queryKey: weightKeys.weights(change.userId) }),
  })
}
