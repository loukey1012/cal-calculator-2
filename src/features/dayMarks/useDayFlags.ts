import { useCallback, useMemo, useState } from 'react'
import { cheatMeals as cheatMealsOf, type MealType } from '../meals/dayModel'
import { useDay, useDayMark, useSetCheatMeal, useSetDayMark } from '../meals/hooks'
import type { DayMark } from '../meals/mealsApi'
import { flagToastText, nextDayMark, type DayFlag, type FlagChange } from './dayFlags'
import { useGymDay, useSetGymDay, useSetSexDay, useSexDay } from './hooks'

export type FlagToast = { readonly message: string; readonly undo: () => void }

export type DayFlags = {
  readonly dayMark: DayMark
  readonly dayMarkLoaded: boolean
  readonly cheatMeals: ReadonlySet<MealType>
  readonly cheatMealsLoaded: boolean
  readonly gym: boolean
  readonly gymLoaded: boolean
  /** null without a household: the Sex chip isn't shown */
  readonly sex: boolean | null
  readonly sexLoaded: boolean
  readonly toggle: (flag: DayFlag) => void
  readonly toggleCheatMeal: (meal: MealType) => void
}

type Input = {
  /** whose day is open (may be the partner's) */
  readonly userId: string
  readonly householdId: string | null
  readonly date: string
  /** the partner's display name when the open day is the partner's, else null */
  readonly partnerName: string | null
  readonly onChanged: (toast: FlagToast) => void
}

const DAY_MARK = 'dayMark'
const GYM = 'gym'
const SEX = 'sex'
const mealKey = (meal: MealType) => `meal:${meal}`

/** how long a tapped value is trusted over the cache while the cache hasn't caught up */
export const PENDING_MS = 1500

type Pending<T> = { readonly value: T; readonly at: number }
type PendingStore<T> = Map<string, Pending<T>>

/**
 * The value just tapped for a key, until the cache shows it (or PENDING_MS passed). The optimistic
 * cache update of a saved change runs a moment after the tap, so two quick taps would otherwise
 * both read the old value.
 */
function latestOf<T>(store: PendingStore<T>, key: string, cached: T): T {
  const entry = store.get(key)
  if (!entry) return cached
  if (entry.value === cached || Date.now() - entry.at > PENDING_MS) {
    store.delete(key)
    return cached
  }
  return entry.value
}

/**
 * The flag chips of an open day: each tap saves at once through the day hooks (optimistic, queued
 * offline) and reports a toast whose Undo sends the previous value as a new change.
 */
export function useDayFlags({
  userId,
  householdId,
  date,
  partnerName,
  onChanged,
}: Input): DayFlags {
  const dayMarkQuery = useDayMark(userId, date)
  const dayQuery = useDay(userId, date)
  const gymQuery = useGymDay(userId, date)
  const sexQuery = useSexDay(householdId, date)
  const setDayMark = useSetDayMark(userId, date)
  const setCheatMeal = useSetCheatMeal(userId, date)
  const setGym = useSetGymDay(userId, date)
  const setSex = useSetSexDay(householdId, date, userId)

  // stores live as long as the hook; entries are keyed by person and day, so another day's
  // leftovers never decide this day's next tap
  const [markStore] = useState<PendingStore<DayMark>>(() => new Map())
  const [flagStore] = useState<PendingStore<boolean>>(() => new Map())
  const keyOf = (name: string) => `${userId}|${date}|${name}`

  const cachedCheatMeals = useMemo(
    () => (dayQuery.data ? cheatMealsOf(dayQuery.data) : new Set<MealType>()),
    [dayQuery.data],
  )

  const report = useCallback(
    (change: FlagChange, undo: () => void) =>
      onChanged({ message: flagToastText(change, partnerName), undo }),
    [onChanged, partnerName],
  )

  /** Saves a value, remembers it as the latest and reports the toast with its Undo. */
  const save = <T>(
    store: PendingStore<T>,
    key: string,
    previous: T,
    next: T,
    send: (value: T) => void,
    change: FlagChange,
  ) => {
    const apply = (value: T) => {
      store.set(key, { value, at: Date.now() })
      send(value)
    }
    apply(next)
    report(change, () => apply(previous))
  }

  const toggle = (flag: DayFlag) => {
    if (flag === 'cheatDay' || flag === 'alcohol') {
      if (dayMarkQuery.data === undefined) return
      const key = keyOf(DAY_MARK)
      const previous = latestOf(markStore, key, dayMarkQuery.data)
      const next = nextDayMark(previous, flag)
      const changed = flag === 'cheatDay' ? next === 'cheat' : next === 'alcohol'
      save(markStore, key, previous, next, (mark) => setDayMark.mutate(mark), {
        flag,
        on: changed,
      })
      return
    }
    if (flag === 'gym') {
      if (gymQuery.data === undefined) return
      const key = keyOf(GYM)
      const previous = latestOf(flagStore, key, gymQuery.data)
      save(flagStore, key, previous, !previous, (on) => setGym.mutate(on), {
        flag,
        on: !previous,
      })
      return
    }
    if (!setSex || sexQuery.data === undefined) return
    const key = keyOf(SEX)
    const previous = latestOf(flagStore, key, sexQuery.data)
    save(flagStore, key, previous, !previous, (on) => setSex.mutate(on), {
      flag,
      on: !previous,
    })
  }

  const toggleCheatMeal = (meal: MealType) => {
    if (dayQuery.data === undefined) return
    const key = keyOf(mealKey(meal))
    const previous = latestOf(flagStore, key, cachedCheatMeals.has(meal))
    save(
      flagStore,
      key,
      previous,
      !previous,
      (cheatMeal) => setCheatMeal.mutate({ mealType: meal, cheatMeal }),
      { flag: 'cheatMeal', meal, on: !previous },
    )
  }

  return {
    dayMark: dayMarkQuery.data ?? null,
    dayMarkLoaded: dayMarkQuery.data !== undefined,
    cheatMeals: cachedCheatMeals,
    cheatMealsLoaded: dayQuery.data !== undefined,
    gym: gymQuery.data ?? false,
    gymLoaded: gymQuery.data !== undefined,
    sex: householdId ? (sexQuery.data ?? false) : null,
    sexLoaded: householdId !== null && sexQuery.data !== undefined,
    toggle,
    toggleCheatMeal,
  }
}
