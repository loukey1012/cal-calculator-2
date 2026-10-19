import { fromLocalDateString, toLocalDateString } from '../../lib/dates'
import { toWholeKcal } from '../nutrition/format'
import { goalForDate, type Goal } from '../nutrition/goals'
import { countsInAverages, isCheat, isMissingMeals, type CountedDay } from './dayCounting'

const DAYS_PER_WEEK = 7

/** One person's totals for a day (from the daily_totals view). */
export type DayTotal = CountedDay & {
  readonly kcal: number
  readonly protein: number
  /** some food that day came from a dish whose calories are an estimate */
  readonly kcalEstimated: boolean
}

export type DayStatus =
  | 'none'
  | 'logged'
  | 'onTarget'
  | 'over'
  | 'cheatDay'
  | 'cheatMeal'
  /** a past day without food at lunch or dinner (see dayCounting) */
  | 'missing'

export type MonthSummary = {
  /** days with something logged that count (see dayCounting) */
  readonly loggedDays: number
  /** past days with something logged that don't count: cheat days, a meal missing */
  readonly leftOutDays: number
  readonly averageKcal: number
  readonly averageProtein: number
  /** a logged day had estimated calories, so the average is approximate too */
  readonly estimated: boolean
}

/** First day (YYYY-MM-01) of the month containing `date`. */
export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`
}

export function addMonths(month: string, count: number): string {
  const start = fromLocalDateString(month)
  return toLocalDateString(new Date(start.getFullYear(), start.getMonth() + count, 1))
}

export function monthRange(month: string): { readonly first: string; readonly last: string } {
  const start = fromLocalDateString(month)
  const last = new Date(start.getFullYear(), start.getMonth() + 1, 0)
  return { first: month, last: toLocalDateString(last) }
}

/** Weeks of the month, Monday first; null pads the days outside the month. */
export function monthGrid(month: string): ReadonlyArray<ReadonlyArray<string | null>> {
  const start = fromLocalDateString(month)
  const daysInMonth = Number(monthRange(month).last.slice(8))
  const leadingBlanks = (start.getDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK
  const days = Array.from({ length: daysInMonth }, (_, index) =>
    toLocalDateString(new Date(start.getFullYear(), start.getMonth(), index + 1)),
  )
  const cells = [...Array<null>(leadingBlanks).fill(null), ...days]
  const trailingBlanks = (DAYS_PER_WEEK - (cells.length % DAYS_PER_WEEK)) % DAYS_PER_WEEK
  const padded = [...cells, ...Array<null>(trailingBlanks).fill(null)]
  return Array.from({ length: padded.length / DAYS_PER_WEEK }, (_, week) =>
    padded.slice(week * DAYS_PER_WEEK, (week + 1) * DAYS_PER_WEEK),
  )
}

/**
 * Judged against the goal that was valid on that day, with calories rounded up like everywhere.
 * Cheat days and days missing a main meal are never judged: they don't count.
 */
export function dayStatus(
  date: string,
  total: DayTotal | undefined,
  goals: readonly Goal[],
  today: string,
): DayStatus {
  if (total?.cheatDay) return 'cheatDay'
  if (total?.cheatMeal) return 'cheatMeal'
  if (isMissingMeals(date, total, today)) return 'missing'
  if (!total || total.mealCount === 0) return 'none'
  const goal = goalForDate(goals, total.date)
  if (!goal) return 'logged'
  return toWholeKcal(total.kcal) <= goal.kcal ? 'onTarget' : 'over'
}

export function monthSummary(totals: readonly DayTotal[], today: string): MonthSummary {
  const logged = totals.filter((day) => countsInAverages(day, today))
  const leftOutDays = totals.filter(
    (day) =>
      day.date < today && (day.mealCount > 0 || isCheat(day)) && !countsInAverages(day, today),
  ).length
  if (logged.length === 0) {
    return { loggedDays: 0, leftOutDays, averageKcal: 0, averageProtein: 0, estimated: false }
  }
  const sum = (pick: (day: DayTotal) => number) =>
    logged.reduce((total, day) => total + pick(day), 0)
  return {
    loggedDays: logged.length,
    leftOutDays,
    averageKcal: sum((day) => day.kcal) / logged.length,
    averageProtein: sum((day) => day.protein) / logged.length,
    estimated: logged.some((day) => day.kcalEstimated),
  }
}
