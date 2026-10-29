import { countsInAverages } from '../../../../supabase/functions/_shared/dayCounting'
import {
  countedOf,
  meanGoalTarget,
  savedKcal,
  withinGoal,
  type SavedKcal,
} from '../../../../supabase/functions/_shared/weekSummary'
import { MEAL_TYPES, type MealType } from '../../meals/dayModel'
import { toWholeKcal } from '../../nutrition/format'
import { goalForDate, type Goal } from '../../nutrition/goals'
import type { DayTotal } from '../calendar'

/**
 * The figures of a week. One rule runs through all of them: only days that count (see
 * dayCounting: over, lunch and dinner logged, no cheat day, alcohol day or cheat meal) take
 * part. Pure functions over the week's data.
 */

/** A day with the nutrients the week page averages (the month's totals carry kcal and protein only). */
export type WeekDay = DayTotal & {
  readonly carbs: number
  readonly fat: number
  readonly fiber: number
}

/** The calories of one meal of a day. */
export type MealKcal = { readonly date: string; readonly mealType: MealType; readonly kcal: number }

/** A food (by name) logged on a day. */
export type LoggedFood = { readonly date: string; readonly name: string }

export { countedOf, savedKcal, type SavedKcal }

export type DailyBudget = {
  /** today and the rest of the week */
  readonly daysLeft: number
  /** calories a day that keep the week within goal; zero or less when it is already over */
  readonly perDay: number
}

/** For the running week: what is left of the week's goal, per remaining day. */
export function dailyBudget(
  days: readonly DayTotal[],
  goals: readonly Goal[],
  today: string,
  weekDates: readonly string[],
): DailyBudget | null {
  const goal = goalForDate(goals, today)
  const daysLeft = weekDates.filter((date) => date >= today).length
  if (!goal || daysLeft === 0 || !weekDates.includes(today)) return null
  const counted = countedOf(days, today)
  const eaten = counted.reduce((sum, day) => sum + toWholeKcal(day.kcal), 0)
  // each counted day against the goal of its own day; the days left against today's
  const allowed = counted.reduce(
    (sum, day) => sum + (goalForDate(goals, day.date) ?? goal).kcal,
    goal.kcal * daysLeft,
  )
  return { daysLeft, perDay: Math.floor((allowed - eaten) / daysLeft) }
}

type Average = { readonly average: number; readonly goal: number | null }
export type NutrientKey = 'protein' | 'carbs' | 'fat' | 'fiber'
export type NutrientAverage = {
  readonly key: NutrientKey
  readonly average: number
  readonly goal: number
}
export type WeekAverages = {
  readonly kcal: Average
  readonly nutrients: readonly NutrientAverage[]
}

const NUTRIENT_GOALS: ReadonlyArray<readonly [NutrientKey, keyof Goal]> = [
  ['protein', 'proteinG'],
  ['carbs', 'carbsG'],
  ['fat', 'fatG'],
  ['fiber', 'fiberG'],
]

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * Averages over the given counted days, each set against the goal valid that day (the target is
 * the mean of those goals); nutrients only where a goal sets a target.
 */
export function weekAverages(
  counted: readonly WeekDay[],
  goals: readonly Goal[],
): WeekAverages | null {
  if (counted.length === 0) return null
  const dayGoals = counted.flatMap((day) => goalForDate(goals, day.date) ?? [])
  const dates = counted.map((day) => day.date)
  const nutrients = NUTRIENT_GOALS.flatMap(([key, goalKey]) => {
    const goal = meanGoalTarget(dates, goals, (candidate) => {
      const target = candidate[goalKey]
      return typeof target === 'number' ? target : null
    })
    return goal === null ? [] : [{ key, average: mean(counted.map((day) => day[key])), goal }]
  })
  return {
    kcal: {
      average: mean(counted.map((day) => day.kcal)),
      goal: dayGoals.length > 0 ? Math.round(mean(dayGoals.map((goal) => goal.kcal))) : null,
    },
    nutrients,
  }
}

export { withinGoal }

/** The days with the most and the fewest calories; null with fewer than two days. */
export function extremes<T extends DayTotal>(
  counted: readonly T[],
): { readonly highest: T; readonly lowest: T } | null {
  const sorted = counted.toSorted((a, b) => a.kcal - b.kcal)
  const lowest = sorted[0]
  const highest = sorted.at(-1)
  return lowest && highest && sorted.length > 1 ? { highest, lowest } : null
}

/** Each meal's average calories over the counted days; a day without that meal counts zero. */
export function mealAverages(
  meals: readonly MealKcal[],
  counted: readonly DayTotal[],
): ReadonlyArray<{ readonly mealType: MealType; readonly average: number }> {
  if (counted.length === 0) return []
  const dates = new Set(counted.map((day) => day.date))
  return MEAL_TYPES.map(({ type }) => ({
    mealType: type,
    average:
      meals
        .filter((meal) => meal.mealType === type && dates.has(meal.date))
        .reduce((sum, meal) => sum + meal.kcal, 0) / counted.length,
  }))
}

const foodKey = (name: string) => name.trim().toLowerCase()

/** The foods eaten on the most counted days (once per day), most first, then by name. */
export function topFoods(
  foods: readonly LoggedFood[],
  counted: readonly DayTotal[],
  limit: number,
): ReadonlyArray<{ readonly name: string; readonly days: number }> {
  const dates = new Set(counted.map((day) => day.date))
  const daysOf = new Map<string, { name: string; dates: Set<string> }>()
  for (const food of foods.filter((candidate) => dates.has(candidate.date))) {
    const entry = daysOf.get(foodKey(food.name)) ?? { name: food.name.trim(), dates: new Set() }
    entry.dates.add(food.date)
    daysOf.set(foodKey(food.name), entry)
  }
  return [...daysOf.values()]
    .map(({ name, dates: eatenOn }) => ({ name, days: eatenOn.size }))
    .filter((food) => food.days > 1)
    .toSorted((a, b) => b.days - a.days || a.name.localeCompare(b.name))
    .slice(0, limit)
}

type Reason =
  'counted' | 'today' | 'alcoholDay' | 'cheatDay' | 'cheatMeal' | 'noLunch' | 'noDinner' | 'noMain'

function reasonOf(day: DayTotal | undefined, date: string, today: string): Reason | null {
  if (date > today) return null
  if (date === today) return 'today'
  if (day && countsInAverages(day, today)) return 'counted'
  if (day?.cheatDay) return 'cheatDay'
  if (day?.alcoholDay) return 'alcoholDay'
  if (day?.cheatMeal) return 'cheatMeal'
  const lunch = day?.lunchLogged !== false && day !== undefined && day.mealCount > 0
  const dinner = day?.dinnerLogged !== false && day !== undefined && day.mealCount > 0
  if (!lunch && !dinner) return 'noMain'
  return lunch ? 'noDinner' : 'noLunch'
}

const REASON_ORDER: ReadonlyArray<readonly [Reason, (count: number) => string]> = [
  ['counted', (count) => `${count} counted`],
  ['alcoholDay', (count) => `${count} alcohol ${count === 1 ? 'day' : 'days'}`],
  ['cheatDay', (count) => `${count} cheat ${count === 1 ? 'day' : 'days'}`],
  ['cheatMeal', (count) => `${count} cheat ${count === 1 ? 'meal' : 'meals'}`],
  ['noLunch', (count) => `${count} ${count === 1 ? 'lunch' : 'lunches'} missing`],
  ['noDinner', (count) => `${count} ${count === 1 ? 'dinner' : 'dinners'} missing`],
  ['noMain', (count) => `${count} ${count === 1 ? 'day' : 'days'} without lunch and dinner`],
]

/** e.g. ["5 counted", "1 alcohol day", "1 dinner missing"]; days to come are not mentioned. */
export function countingSummary(
  dates: readonly string[],
  totals: ReadonlyMap<string, DayTotal>,
  today: string,
): string[] {
  const reasons = dates.map((date) => reasonOf(totals.get(date), date, today))
  const parts = REASON_ORDER.flatMap(([reason, describe]) => {
    const count = reasons.filter((candidate) => candidate === reason).length
    return count > 0 || reason === 'counted' ? [describe(count)] : []
  })
  return reasons.includes('today') ? [...parts, 'today, not over yet'] : parts
}
