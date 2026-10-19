import { fromLocalDateString, toLocalDateString } from '../../lib/dates'
import { toWholeKcal } from '../nutrition/format'
import { goalForDate, type Goal } from '../nutrition/goals'

const DAYS_PER_WEEK = 7

/** One person's totals for a day (from the daily_totals view). */
export type DayTotal = {
  readonly date: string
  readonly kcal: number
  readonly protein: number
  readonly mealCount: number
  /** some food that day came from a dish whose calories are an estimate */
  readonly kcalEstimated: boolean
  /** a cheat day (missing in data cached by older versions) */
  readonly cheatDay?: boolean
  /** a meal that day was a cheat meal */
  readonly cheatMeal?: boolean
}

export type DayStatus = 'none' | 'logged' | 'onTarget' | 'over' | 'cheatDay' | 'cheatMeal'

export type MonthSummary = {
  /** days with something logged that count */
  readonly loggedDays: number
  /** cheat days and days with a cheat meal */
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

/** Cheat days and days with a cheat meal are left out of averages and never "over". */
export function isLeftOut(day: Pick<DayTotal, 'cheatDay' | 'cheatMeal'>): boolean {
  return day.cheatDay === true || day.cheatMeal === true
}

/** Judged against the goal that was valid on that day, with calories rounded up like everywhere. */
export function dayStatus(total: DayTotal | undefined, goals: readonly Goal[]): DayStatus {
  if (total?.cheatDay) return 'cheatDay'
  if (total?.cheatMeal) return 'cheatMeal'
  if (!total || total.mealCount === 0) return 'none'
  const goal = goalForDate(goals, total.date)
  if (!goal) return 'logged'
  return toWholeKcal(total.kcal) <= goal.kcal ? 'onTarget' : 'over'
}

export function monthSummary(totals: readonly DayTotal[]): MonthSummary {
  const logged = totals.filter((day) => day.mealCount > 0 && !isLeftOut(day))
  const leftOutDays = totals.filter(isLeftOut).length
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
