import { fromLocalDateString, toLocalDateString } from '../../lib/dates'
import { calorieOverLevel } from '../appearance/overColors'
import { toWholeKcal } from '../nutrition/format'
import { goalForDate, type Goal } from '../nutrition/goals'
import {
  countsInAverages,
  isMissingMeals,
  type CountedDay,
} from '../../../supabase/functions/_shared/dayCounting'

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
  /** more than 10 % over the calorie goal (the rings' first over color) */
  | 'over'
  /** more than 300 kcal over it (the rings' second over color) */
  | 'wellOver'
  | 'cheatDay'
  | 'alcoholDay'
  | 'cheatMeal'
  /** a past day without food at lunch or dinner (see dayCounting) */
  | 'missing'

/** What a day shows besides how it went: small marks in its calendar cell. */
export type DayMarks = {
  /** a note on the day or on one of its meals */
  readonly hasNote: boolean
  /** a weight was entered on that very day */
  readonly weighed: boolean
  /** some of the day's calories are an estimate */
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

/**
 * The calendar weeks that touch the month, Monday first. The first and last week hold days of
 * the neighbouring months too (their week average needs them); a date outside `month` is one of those.
 */
export function monthWeeks(month: string): ReadonlyArray<ReadonlyArray<string>> {
  const start = fromLocalDateString(month)
  const daysInMonth = Number(monthRange(month).last.slice(8))
  const leadingDays = (start.getDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK
  const weekCount = Math.ceil((leadingDays + daysInMonth) / DAYS_PER_WEEK)
  return Array.from({ length: weekCount }, (_, week) =>
    Array.from({ length: DAYS_PER_WEEK }, (_, day) =>
      // the Date constructor carries days before the 1st and after the last into the neighbours
      toLocalDateString(
        new Date(
          start.getFullYear(),
          start.getMonth(),
          week * DAYS_PER_WEEK + day + 1 - leadingDays,
        ),
      ),
    ),
  )
}

/** The days of the first and last week that lie outside the month, as up to two date ranges. */
export function weekEdgeRanges(
  month: string,
): ReadonlyArray<{ readonly first: string; readonly last: string }> {
  const { first, last } = monthRange(month)
  const weeks = monthWeeks(month)
  const gridFirst = weeks[0]?.[0] ?? first
  const gridLast = weeks.at(-1)?.at(-1) ?? last
  return [
    gridFirst < first ? { first: gridFirst, last: addDays(first, -1) } : null,
    gridLast > last ? { first: addDays(last, 1), last: gridLast } : null,
  ].filter((range) => range !== null)
}

function addDays(date: string, count: number): string {
  const day = fromLocalDateString(date)
  return toLocalDateString(new Date(day.getFullYear(), day.getMonth(), day.getDate() + count))
}

/**
 * Judged against the goal that was valid on that day, with calories rounded up like everywhere.
 * Cheat days, alcohol days and days missing a main meal are never judged: they don't count.
 */
export function dayStatus(
  date: string,
  total: DayTotal | undefined,
  goals: readonly Goal[],
  today: string,
): DayStatus {
  if (total?.cheatDay) return 'cheatDay'
  if (total?.alcoholDay) return 'alcoholDay'
  if (total?.cheatMeal) return 'cheatMeal'
  if (isMissingMeals(date, total, today)) return 'missing'
  if (!total || total.mealCount === 0) return 'none'
  const goal = goalForDate(goals, total.date)
  if (!goal) return 'logged'
  const kcal = toWholeKcal(total.kcal)
  const level = calorieOverLevel(kcal, goal.kcal)
  if (level === 'none') return 'onTarget'
  return level === 'well' ? 'wellOver' : 'over'
}

/** The average calories of the days of one calendar week that count; null when none does. */
export function weekAverageKcal(
  week: ReadonlyArray<string | null>,
  totals: ReadonlyMap<string, DayTotal>,
  today: string,
): number | null {
  const counted = week
    .map((date) => (date === null ? undefined : totals.get(date)))
    .filter((total): total is DayTotal => total !== undefined && countsInAverages(total, today))
  if (counted.length === 0) return null
  return counted.reduce((sum, day) => sum + day.kcal, 0) / counted.length
}
