import type { Tables } from '../../lib/database.types'
import { toWholeKcal } from './format'
import type { NutrientKey, NutritionTotals } from './types'

export type Goal = {
  /** First day (YYYY-MM-DD) this goal applies to. */
  readonly validFrom: string
  readonly kcal: number
  readonly proteinG: number | null
  readonly carbsG: number | null
  readonly fatG: number | null
}

export type RingKey = 'kcal' | 'protein' | 'carbs' | 'fat'

export type GoalProgress = {
  readonly key: RingKey
  readonly consumed: number
  readonly target: number
  /** consumed / target; above 1 means over the target */
  readonly ratio: number
  /** negative when over the target */
  readonly remaining: number
  readonly reached: boolean
  /** some logged item had no value for this nutrient, so `consumed` is a lower bound */
  readonly incomplete: boolean
}

export function goalFromRow(row: Tables<'goal_history'>): Goal {
  return {
    validFrom: row.valid_from,
    kcal: row.kcal,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
  }
}

/** The goal that applied on `date`, so past days are judged against the goal valid back then. */
export function goalForDate(goals: readonly Goal[], date: string): Goal | null {
  // ISO dates compare correctly as strings
  return goals
    .filter((goal) => goal.validFrom <= date)
    .reduce<Goal | null>(
      (latest, goal) => (latest === null || goal.validFrom > latest.validFrom ? goal : latest),
      null,
    )
}

function progress(
  key: RingKey,
  consumed: number,
  target: number,
  missing: readonly NutrientKey[],
): GoalProgress {
  return {
    key,
    consumed,
    target,
    ratio: target > 0 ? consumed / target : 1,
    remaining: target - consumed,
    reached: consumed >= target,
    incomplete: key !== 'kcal' && missing.includes(key),
  }
}

/** Calories always; protein, carbs and fat only when a target is set. */
export function goalProgress(totals: NutritionTotals, goal: Goal): readonly GoalProgress[] {
  const rings: ReadonlyArray<readonly [RingKey, number | null, number]> = [
    // rounded up like everywhere it is displayed
    ['kcal', goal.kcal, toWholeKcal(totals.kcal)],
    ['protein', goal.proteinG, totals.protein],
    ['carbs', goal.carbsG, totals.carbs],
    ['fat', goal.fatG, totals.fat],
  ]
  return rings.flatMap(([key, target, consumed]) =>
    target === null ? [] : [progress(key, consumed, target, totals.missing)],
  )
}
