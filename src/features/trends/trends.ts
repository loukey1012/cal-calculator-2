import { fromLocalDateString, toLocalDateString } from '../../lib/dates'
import { roundTo } from '../../lib/numbers'
import { goalForDate, type Goal } from '../nutrition/goals'
import { weightOn, type WeightEntry } from '../weight/weight'

/** What the Trends view charts: one metric over one range at a time. */

export const TREND_RANGES = ['4w', '3m', '6m', '1y'] as const
export type TrendRange = (typeof TREND_RANGES)[number]
const RANGE_DAYS: Readonly<Record<TrendRange, number>> = {
  '4w': 28,
  '3m': 91,
  '6m': 182,
  '1y': 365,
}
// long ranges show one bar per week, so the bars stay readable
const WEEKLY_RANGES: ReadonlySet<TrendRange> = new Set(['6m', '1y'])
const DAYS_PER_WEEK = 7
const WEIGHT_DECIMALS = 1

export type NutritionMetric = 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber'
export type TrendMetric = NutritionMetric | 'weight'

const GOAL_FIELDS: Readonly<Record<Exclude<NutritionMetric, 'kcal'>, keyof Goal>> = {
  protein: 'proteinG',
  carbs: 'carbsG',
  fat: 'fatG',
  fiber: 'fiberG',
}

/** One logged day's totals (from the daily_totals view). */
export type NutritionDay = {
  readonly date: string
  readonly kcal: number
  readonly protein: number
  readonly carbs: number
  readonly fat: number
  readonly fiber: number
  /** some food that day had estimated calories */
  readonly estimated: boolean
  readonly mealCount: number
}

export function addDays(date: string, count: number): string {
  const day = fromLocalDateString(date)
  return toLocalDateString(new Date(day.getFullYear(), day.getMonth(), day.getDate() + count))
}

export type RangeBounds = {
  readonly first: string
  readonly last: string
  /** the range of the same length just before, to compare with */
  readonly previousFirst: string
  readonly previousLast: string
}

export function rangeBounds(range: TrendRange, today: string): RangeBounds {
  const length = RANGE_DAYS[range]
  const first = addDays(today, 1 - length)
  return {
    first,
    last: today,
    previousFirst: addDays(first, -length),
    previousLast: addDays(first, -1),
  }
}

/** Calories always; a nutrient once it has a target; weight with a target or entries. */
export function availableMetrics(goal: Goal | null, hasWeights: boolean): TrendMetric[] {
  const nutrients = (Object.keys(GOAL_FIELDS) as Array<keyof typeof GOAL_FIELDS>).filter(
    (metric) => goal !== null && goal[GOAL_FIELDS[metric]] !== null,
  )
  const weight = hasWeights || goal?.weightGoalKg != null ? (['weight'] as const) : []
  return ['kcal', ...nutrients, ...weight]
}

export function goalOf(goal: Goal | null, metric: NutritionMetric): number | null {
  if (!goal) return null
  return metric === 'kcal' ? goal.kcal : (goal[GOAL_FIELDS[metric]] as number | null)
}

/** Calories count when at or under the goal; nutrients once the target is reached. */
function atGoal(metric: NutritionMetric, value: number, goal: number | null): boolean {
  if (goal === null) return false
  return metric === 'kcal' ? value <= goal : value >= goal
}

const logged = (days: readonly NutritionDay[]) => days.filter((day) => day.mealCount > 0)
const average = (values: readonly number[]) =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length

export type TrendBar = {
  readonly start: string
  readonly end: string
  /** the day's value, or the average of the week's logged days */
  readonly value: number
  readonly goal: number | null
  readonly estimated: boolean
  /** logged days in it */
  readonly days: number
}

function mondayOf(date: string): string {
  const weekday = (fromLocalDateString(date).getDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK
  return addDays(date, -weekday)
}

function barOf(
  start: string,
  end: string,
  days: readonly NutritionDay[],
  metric: NutritionMetric,
  goals: readonly Goal[],
): TrendBar {
  const last = days.at(-1)?.date ?? end
  return {
    start,
    end,
    value: average(days.map((day) => day[metric])) ?? 0,
    goal: goalOf(goalForDate(goals, last), metric),
    estimated: days.some((day) => day.estimated),
    days: days.length,
  }
}

/** Bars over the range: per logged day, or per week for long ranges. Unlogged days have none. */
export function nutritionBars(
  days: readonly NutritionDay[],
  metric: NutritionMetric,
  range: TrendRange,
  goals: readonly Goal[],
): TrendBar[] {
  const sorted = logged(days).toSorted((a, b) => a.date.localeCompare(b.date))
  if (!WEEKLY_RANGES.has(range)) {
    return sorted.map((day) => barOf(day.date, day.date, [day], metric, goals))
  }
  const weeks = new Map<string, NutritionDay[]>()
  for (const day of sorted) {
    const monday = mondayOf(day.date)
    weeks.set(monday, [...(weeks.get(monday) ?? []), day])
  }
  return [...weeks].map(([monday, week]) =>
    barOf(monday, addDays(monday, DAYS_PER_WEEK - 1), week, metric, goals),
  )
}

export type NutritionSummary = {
  readonly average: number | null
  readonly loggedDays: number
  /** logged days within (calories) or reaching (nutrients) that day's goal */
  readonly goalDays: number
  readonly previousAverage: number | null
}

export function nutritionSummary(
  days: readonly NutritionDay[],
  previousDays: readonly NutritionDay[],
  metric: NutritionMetric,
  goals: readonly Goal[],
): NutritionSummary {
  const shown = logged(days)
  return {
    average: average(shown.map((day) => day[metric])),
    loggedDays: shown.length,
    goalDays: shown.filter((day) =>
      atGoal(metric, day[metric], goalOf(goalForDate(goals, day.date), metric)),
    ).length,
    previousAverage: average(logged(previousDays).map((day) => day[metric])),
  }
}

export type WeightPoint = {
  readonly date: string
  readonly weightKg: number
  /** the weight entered before the range, as it applied on its first day */
  readonly carried: boolean
}

export function weightPoints(
  entries: readonly WeightEntry[],
  first: string,
  last: string,
): WeightPoint[] {
  const inRange = entries
    .filter((entry) => entry.date >= first && entry.date <= last)
    .toSorted((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({ ...entry, carried: false }))
  const before = weightOn(entries, addDays(first, -1))
  if (!before || inRange.length === 0 || inRange[0]?.date === first) return inRange
  return [{ date: first, weightKg: before.weightKg, carried: true }, ...inRange]
}

export type WeightSummary = {
  readonly current: number | null
  /** since the range's first day (negative: lost) */
  readonly change: number | null
  /** still to lose (positive) or gain (negative); 0 once reached */
  readonly toGo: number | null
}

export function weightSummary(
  entries: readonly WeightEntry[],
  first: string,
  today: string,
  goalKg: number | null,
): WeightSummary {
  const current = weightOn(entries, today)?.weightKg ?? null
  const start = weightOn(entries, first) ?? entries.find((entry) => entry.date >= first) ?? null
  return {
    current,
    change: current === null || !start ? null : roundTo(current - start.weightKg, WEIGHT_DECIMALS),
    toGo: current === null || goalKg === null ? null : roundTo(current - goalKg, WEIGHT_DECIMALS),
  }
}
