import { countsInAverages } from '../../../supabase/functions/_shared/dayCounting'
import type { MealType } from '../meals/dayModel'
import type { Goal } from '../nutrition/goals'
import type { WeightEntry } from '../weight/weight'
import { dayStatus, type DayStatus, type DayTotal } from './calendar'

/** A note of the month: on the day itself (`mealType` null) or on one of its meals. */
export type MonthNote = {
  readonly date: string
  readonly mealType: MealType | null
  readonly text: string
}

export type MonthGoalStats = {
  /** counted days (see dayCounting) within the goal that was valid that day */
  readonly withinGoal: number
  /** counted days that had a goal */
  readonly judgedDays: number
  /** most consecutive counted days within goal; days that don't count are passed over */
  readonly longestStreak: number
}

/** Only counted days are looked at: the others are never part of a figure. */
export function monthGoalStats(
  totals: readonly DayTotal[],
  goals: readonly Goal[],
  today: string,
): MonthGoalStats {
  const judged = totals
    .filter((total) => countsInAverages(total, today))
    .toSorted((a, b) => a.date.localeCompare(b.date))
    .map((total) => dayStatus(total.date, total, goals, today))
    // a counted day without a goal valid that day is in neither number
    .filter((status) => status !== 'logged' && status !== 'none')
  let streak = 0
  let longestStreak = 0
  for (const status of judged) {
    streak = status === 'onTarget' ? streak + 1 : 0
    longestStreak = Math.max(longestStreak, streak)
  }
  return {
    withinGoal: judged.filter((status) => status === 'onTarget').length,
    judgedDays: judged.length,
    longestStreak,
  }
}

/** Last weigh-in of the month minus the first; null with fewer than two in the month. */
export function weightChangeInMonth(entries: readonly WeightEntry[], month: string): number | null {
  const prefix = month.slice(0, 7)
  const inMonth = entries
    .filter((entry) => entry.date.startsWith(prefix))
    .toSorted((a, b) => a.date.localeCompare(b.date))
  const first = inMonth.at(0)
  const last = inMonth.at(-1)
  if (inMonth.length < 2 || !first || !last) return null
  return last.weightKg - first.weightKg
}

export function noteDatesOf(notes: readonly MonthNote[]): ReadonlySet<string> {
  return new Set(notes.map((note) => note.date))
}

export type MonthFilter = 'notes' | 'alcohol' | 'cheat' | 'missing'

export const MONTH_FILTERS: ReadonlyArray<{ readonly value: MonthFilter; readonly label: string }> =
  [
    { value: 'notes', label: 'Notes' },
    { value: 'alcohol', label: 'Alcohol' },
    { value: 'cheat', label: 'Cheat' },
    { value: 'missing', label: 'Missing' },
  ]

/** The filter kept in the navigation state; anything else reads as none. */
export function monthFilterOf(state: unknown): MonthFilter | null {
  if (typeof state !== 'object' || state === null || !('filter' in state)) return null
  return MONTH_FILTERS.find((option) => option.value === state.filter)?.value ?? null
}

/** Alcohol and cheat look at the day's flags: a status shows only one of them. */
export function filterMatches(
  filter: MonthFilter,
  status: DayStatus,
  hasNote: boolean,
  total?: DayTotal,
): boolean {
  switch (filter) {
    case 'notes':
      return hasNote
    case 'alcohol':
      return total?.alcoholDay === true
    case 'cheat':
      return total?.cheatDay === true || total?.cheatMeal === true
    case 'missing':
      return status === 'missing'
  }
}
