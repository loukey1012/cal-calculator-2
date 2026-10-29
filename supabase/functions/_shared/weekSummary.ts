import { calorieOverLevel, toWholeKcal } from './calorieGoal.ts'
import { addDays } from './isoWeek.ts'
import { countsInAverages, isLeftOut, type CountedDay } from './dayCounting.ts'

/**
 * The figures of a week that the week page and the weekly notification share. One rule runs
 * through all of them: only days that count (see dayCounting) take part. Plain TypeScript
 * without dependencies.
 */

export type WeekNutrientId = 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'salt'

export type WeekDayRow = CountedDay & {
  readonly kcal: number
  /** missing for callers that only need calories */
  readonly protein?: number | null
  readonly carbs?: number | null
  readonly fat?: number | null
  readonly fiber?: number | null
  readonly sugar?: number | null
  readonly salt?: number | null
}

/** What the figures need of a goal. */
type KcalGoal = {
  readonly validFrom: string
  readonly kcal: number
  readonly protein?: number | null
  readonly carbs?: number | null
  readonly fat?: number | null
  readonly fiber?: number | null
}

export type SavedKcal = {
  /** burned minus eaten; negative is a surplus */
  readonly saved: number
  readonly burned: number
  readonly eaten: number
  /** the counted days the figure is made of */
  readonly days: number
}

/** The goal that applied on `date`, so past days are judged against the goal valid back then. */
export function goalOn<T extends { readonly validFrom: string }>(
  goals: readonly T[],
  date: string,
): T | null {
  // ISO dates compare correctly as strings
  return goals
    .filter((goal) => goal.validFrom <= date)
    .reduce<T | null>(
      (latest, goal) => (latest === null || goal.validFrom > latest.validFrom ? goal : latest),
      null,
    )
}

/**
 * The mean of a goal's target over the given days, each day taking the goal valid on it; days
 * whose goal has no such target are left out. Null when no day has one.
 */
export function meanGoalTarget<T extends { readonly validFrom: string }>(
  dates: readonly string[],
  goals: readonly T[],
  targetOf: (goal: T) => number | null | undefined,
): number | null {
  const targets = dates.flatMap((date) => {
    const goal = goalOn(goals, date)
    const target = goal ? targetOf(goal) : null
    return typeof target === 'number' ? [target] : []
  })
  return targets.length > 0
    ? targets.reduce((sum, target) => sum + target, 0) / targets.length
    : null
}

export function countedOf<T extends CountedDay>(days: readonly T[], today: string): T[] {
  return days.filter((day) => countsInAverages(day, today))
}

/**
 * Over the counted days: the person's calories burned per day (one figure for every day) minus
 * what was eaten. Null when no figure is set or no day counts.
 */
export function savedKcal(
  days: readonly WeekDayRow[],
  kcalBurned: number | null,
  today: string,
): SavedKcal | null {
  const counted = countedOf(days, today)
  if (kcalBurned == null || counted.length === 0) return null
  const burned = kcalBurned * counted.length
  const eaten = counted.reduce((sum, day) => sum + toWholeKcal(day.kcal), 0)
  return { saved: burned - eaten, burned, eaten, days: counted.length }
}

/** How many of the counted days (those with a goal) were within it; null when none has a goal. */
export function withinGoal(
  counted: readonly WeekDayRow[],
  goals: readonly KcalGoal[],
): { readonly within: number; readonly of: number } | null {
  const judged = counted.flatMap((day) => {
    const goal = goalOn(goals, day.date)
    return goal ? [{ kcal: toWholeKcal(day.kcal), target: goal.kcal }] : []
  })
  if (judged.length === 0) return null
  const within = judged.filter((day) => calorieOverLevel(day.kcal, day.target) === 'none')
  return { within: within.length, of: judged.length }
}

export type NutrientAverage = {
  readonly average: number
  /** the mean of the goals valid on the counted days; sugar and salt have none */
  readonly goal: number | null
}

export type WeekFigures = {
  readonly counted: number
  /** the average calories of the counted days, rounded up */
  readonly averageKcal: number
  readonly within: { readonly within: number; readonly of: number } | null
  /** burned minus eaten, negative for a surplus; null without a burned figure */
  readonly saved: number | null
  readonly burned: number | null
  readonly eaten: number | null
  /** past days with an entry (food or a cheat/alcohol flag) that don't count */
  readonly leftOut: number
  /** per nutrient: the average over the counted days that have a value; null without any */
  readonly nutrients: Readonly<Record<WeekNutrientId, NutrientAverage | null>>
}

function averageOf(
  counted: readonly WeekDayRow[],
  id: WeekNutrientId,
  target: number | null,
): NutrientAverage | null {
  const values = counted.flatMap((day) => (day[id] == null ? [] : [day[id]]))
  if (values.length === 0) return null
  return { average: values.reduce((sum, value) => sum + value, 0) / values.length, goal: target }
}

function nutrientAverages(
  counted: readonly WeekDayRow[],
  goals: readonly KcalGoal[],
): WeekFigures['nutrients'] {
  const dates = counted.map((day) => day.date)
  const targetOf = (id: 'protein' | 'carbs' | 'fat' | 'fiber') =>
    meanGoalTarget(dates, goals, (goal) => goal[id])
  return {
    protein: averageOf(counted, 'protein', targetOf('protein')),
    carbs: averageOf(counted, 'carbs', targetOf('carbs')),
    fat: averageOf(counted, 'fat', targetOf('fat')),
    fiber: averageOf(counted, 'fiber', targetOf('fiber')),
    sugar: averageOf(counted, 'sugar', null),
    salt: averageOf(counted, 'salt', null),
  }
}

function leftOutCount(days: readonly WeekDayRow[], today: string): number {
  return days.filter(
    (day) =>
      day.date < today && (day.mealCount > 0 || isLeftOut(day)) && !countsInAverages(day, today),
  ).length
}

/** The notification's figures for a past week; null when no day counted. */
export function weekFigures(
  days: readonly WeekDayRow[],
  goals: readonly KcalGoal[],
  kcalBurned: number | null,
  today: string,
): WeekFigures | null {
  const counted = countedOf(days, today)
  if (counted.length === 0) return null
  const mean = counted.reduce((sum, day) => sum + day.kcal, 0) / counted.length
  const saved = savedKcal(days, kcalBurned, today)
  return {
    counted: counted.length,
    averageKcal: toWholeKcal(mean),
    within: withinGoal(counted, goals),
    saved: saved?.saved ?? null,
    burned: saved?.burned ?? null,
    eaten: saved?.eaten ?? null,
    leftOut: leftOutCount(days, today),
    nutrients: nutrientAverages(counted, goals),
  }
}

/**
 * The day summary's "week so far": the figures of the week's days up to and including `date`
 * (which counts if it is complete, so it is judged as if tomorrow were today). Null when no day
 * counted.
 */
export function weekSoFar(
  days: readonly WeekDayRow[],
  kcalBurned: number | null,
  date: string,
): Pick<WeekFigures, 'averageKcal' | 'saved'> | null {
  const upToDate = days.filter((day) => day.date <= date)
  const figures = weekFigures(upToDate, [], kcalBurned, addDays(date, 1))
  return figures && { averageKcal: figures.averageKcal, saved: figures.saved }
}
