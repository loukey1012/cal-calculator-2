import type { QueryKey } from '@tanstack/react-query'
import type { DayChange } from './dayChanges'

/**
 * A cached query that shows a day change too (a calendar month or year, the month's totals).
 * `apply` gets the cached value and returns the one with the change in it; `dayWasLoaded` says
 * whether the day's own query held data before the change (its optimistic write comes first).
 */
export type CachedMirror = {
  readonly queryKey: QueryKey
  readonly apply: (before: unknown, change: DayChange, dayWasLoaded: boolean) => unknown
}

/**
 * A mirror for a cache entry that is a list. An entry that is not one (a damaged copy on the
 * phone) is left as it is: a mirror only decorates a change, it must never stop it.
 */
export function mirrorOf<T extends readonly unknown[]>(
  queryKey: QueryKey,
  apply: (before: T, change: DayChange, dayWasLoaded: boolean) => T,
): CachedMirror {
  return {
    queryKey,
    apply: (before, change, dayWasLoaded) =>
      Array.isArray(before) ? apply(before as unknown as T, change, dayWasLoaded) : before,
  }
}
