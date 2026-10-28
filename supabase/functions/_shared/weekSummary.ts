import { calorieOverLevel, toWholeKcal } from './calorieGoal.ts'
import { countsInAverages, type CountedDay } from './dayCounting.ts'

/**
 * The figures of a week that the week page and the weekly notification share. One rule runs
 * through all of them: only days that count (see dayCounting) take part. Plain TypeScript
 * without dependencies.
 */

export type WeekDayRow = CountedDay & { readonly kcal: number }

/** What the figures need of a goal. */
type KcalGoal = { readonly validFrom: string; readonly kcal: number }

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

export type WeekFigures = {
  readonly counted: number
  /** the average calories of the counted days, rounded up */
  readonly averageKcal: number
  readonly within: { readonly within: number; readonly of: number } | null
  /** burned minus eaten, negative for a surplus; null without a burned figure */
  readonly saved: number | null
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
  return {
    counted: counted.length,
    averageKcal: toWholeKcal(mean),
    within: withinGoal(counted, goals),
    saved: savedKcal(days, kcalBurned, today)?.saved ?? null,
  }
}
