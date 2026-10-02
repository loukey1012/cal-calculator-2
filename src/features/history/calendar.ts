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
}

export type DayStatus = 'none' | 'logged' | 'onTarget' | 'over'

export type MonthSummary = {
  readonly loggedDays: number
  readonly averageKcal: number
  readonly averageProtein: number
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

/** Judged against the goal that was valid on that day, with calories rounded up like everywhere. */
export function dayStatus(total: DayTotal | undefined, goals: readonly Goal[]): DayStatus {
  if (!total || total.mealCount === 0) return 'none'
  const goal = goalForDate(goals, total.date)
  if (!goal) return 'logged'
  return toWholeKcal(total.kcal) <= goal.kcal ? 'onTarget' : 'over'
}

export function monthSummary(totals: readonly DayTotal[]): MonthSummary {
  const logged = totals.filter((day) => day.mealCount > 0)
  if (logged.length === 0) return { loggedDays: 0, averageKcal: 0, averageProtein: 0 }
  const sum = (pick: (day: DayTotal) => number) =>
    logged.reduce((total, day) => total + pick(day), 0)
  return {
    loggedDays: logged.length,
    averageKcal: sum((day) => day.kcal) / logged.length,
    averageProtein: sum((day) => day.protein) / logged.length,
  }
}
