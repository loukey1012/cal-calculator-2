import { monthKeys } from '../history/hooks'
import { monthStart } from '../history/calendar'
import type { DayTotal } from '../history/calendar'
import { mirrorOf, type CachedMirror } from './cachedMirror'
import type { DayChange } from './dayChanges'

type LeftOutFlags = Partial<Pick<DayTotal, 'cheatDay' | 'alcoholDay' | 'cheatMeal'>>

/** The totals with the flags set on the day's row; a day without a row gets an empty one. */
function withDayFlags(totals: readonly DayTotal[], date: string, flags: LeftOutFlags): DayTotal[] {
  if (totals.some((total) => total.date === date)) {
    return totals.map((total) => (total.date === date ? { ...total, ...flags } : total))
  }
  const empty: DayTotal = {
    date,
    kcal: 0,
    protein: 0,
    mealCount: 0,
    kcalEstimated: false,
    cheatDay: false,
    cheatMeal: false,
    alcoholDay: false,
    lunchLogged: false,
    dinnerLogged: false,
  }
  return [...totals, { ...empty, ...flags }]
}

/**
 * A cheat day or alcohol day (or neither) shown in the cached totals of the day's month. Only the
 * month's totals are mirrored: the `edges` and `year` caches refresh when the save settles.
 */
export function dayMarkMirror(userId: string, date: string): CachedMirror {
  return mirrorOf<DayTotal[]>(monthKeys.month(userId, monthStart(date)), (totals, change) => {
    // 'cheatDay' is the form older versions queued; on replaces an alcohol day, off keeps one
    if (change.kind === 'cheatDay') {
      return withDayFlags(totals, date, {
        cheatDay: change.cheatDay,
        ...(change.cheatDay ? { alcoholDay: false } : {}),
      })
    }
    if (change.kind !== 'dayMark') return totals
    return withDayFlags(totals, date, {
      cheatDay: change.mark === 'cheat',
      alcoholDay: change.mark === 'alcohol',
    })
  })
}

/**
 * A cheat meal shown in the cached totals of the day's month. `anyCheatMealLeft` says whether
 * the day has one after the change. Taking a cheat meal back on a day that was never loaded
 * can't be told (another one may exist), so the cell stays as it is until the next refresh.
 */
export function cheatMealMirror(
  userId: string,
  date: string,
  anyCheatMealLeft: () => boolean,
): CachedMirror {
  return mirrorOf<DayTotal[]>(
    monthKeys.month(userId, monthStart(date)),
    (totals, change: DayChange, dayWasLoaded) => {
      if (change.kind !== 'cheatMeal') return totals
      if (!change.cheatMeal && !dayWasLoaded) return totals
      return withDayFlags(totals, date, { cheatMeal: change.cheatMeal || anyCheatMealLeft() })
    },
  )
}
