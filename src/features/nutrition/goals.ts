import type { Tables } from '../../lib/database.types'
import { toWholeKcal } from './format'
import type { NutritionTotals } from './types'

export type Goal = {
  /** First day (YYYY-MM-DD) this goal applies to. */
  readonly validFrom: string
  readonly kcal: number
  readonly proteinG: number | null
  readonly carbsG: number | null
  readonly fatG: number | null
  readonly fiberG: number | null
  /** the weight to reach; drawn on the weight chart */
  readonly weightGoalKg: number | null
}

export type RingKey = 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber'

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
  /** calories only: some food's calories are an estimate, so `consumed` is approximate */
  readonly estimated: boolean
}

export function goalFromRow(row: Tables<'goal_history'>): Goal {
  return {
    validFrom: row.valid_from,
    kcal: row.kcal,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    fiberG: row.fiber_g,
    weightGoalKg: row.weight_goal_kg,
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
  { missing, estimated }: Pick<NutritionTotals, 'missing' | 'estimated'>,
): GoalProgress {
  return {
    key,
    consumed,
    target,
    ratio: target > 0 ? consumed / target : 1,
    remaining: target - consumed,
    reached: consumed >= target,
    incomplete: key !== 'kcal' && missing.includes(key),
    estimated: key === 'kcal' && estimated,
  }
}

/** Calories always; protein, carbs, fat and fiber only when a target is set. */
export function goalProgress(totals: NutritionTotals, goal: Goal): readonly GoalProgress[] {
  const rings: ReadonlyArray<readonly [RingKey, number | null, number]> = [
    // rounded up like everywhere it is displayed
    ['kcal', goal.kcal, toWholeKcal(totals.kcal)],
    ['protein', goal.proteinG, totals.protein],
    ['carbs', goal.carbsG, totals.carbs],
    ['fat', goal.fatG, totals.fat],
    ['fiber', goal.fiberG, totals.fiber],
  ]
  return rings.flatMap(([key, target, consumed]) =>
    target === null ? [] : [progress(key, consumed, target, totals)],
  )
}
