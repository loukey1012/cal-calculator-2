import { describe, expect, test } from 'vitest'
import type { Tables } from '../../lib/database.types'
import { goalForDate, goalFromRow, goalProgress, type Goal } from './goals'
import { mealTotals } from './totals'
import { values } from './testData'

const SEPTEMBER: Goal = {
  validFrom: '2026-09-01',
  kcal: 2000,
  proteinG: 120,
  carbsG: null,
  fatG: null,
  fiberG: null,
  weightGoalKg: null,
}
const OCTOBER: Goal = {
  validFrom: '2026-10-01',
  kcal: 1800,
  proteinG: 140,
  carbsG: 200,
  fatG: 60,
  fiberG: null,
  weightGoalKg: null,
}

describe('goalFromRow', () => {
  test('maps a goal_history row', () => {
    const row: Tables<'goal_history'> = {
      id: 'g1',
      user_id: 'u1',
      valid_from: '2026-09-01',
      kcal: 2000,
      protein_g: 120,
      carbs_g: null,
      fat_g: null,
      fiber_g: null,
      weight_goal_kg: null,
      created_at: '',
    }

    expect(goalFromRow(row)).toEqual(SEPTEMBER)
  })
})

describe('goalForDate', () => {
  test('uses the most recent goal that was already valid on that day', () => {
    const goals = [OCTOBER, SEPTEMBER]

    expect(goalForDate(goals, '2026-09-15')).toBe(SEPTEMBER)
    expect(goalForDate(goals, '2026-10-01')).toBe(OCTOBER)
    expect(goalForDate(goals, '2026-12-24')).toBe(OCTOBER)
  })

  test('returns null before the first goal or without goals', () => {
    expect(goalForDate([SEPTEMBER], '2026-08-31')).toBeNull()
    expect(goalForDate([], '2026-10-01')).toBeNull()
  })
})

describe('goalProgress', () => {
  const LUNCH = mealTotals([
    { basis_multiplier: 1, ...values(612.2, { protein: 45, carbs: 50, fat: 20 }) },
    { basis_multiplier: 1, ...values(300, { protein: 10 }) },
  ])

  test('always has kcal; protein, carbs and fat only when a target is set', () => {
    expect(goalProgress(LUNCH, SEPTEMBER).map((ring) => ring.key)).toEqual(['kcal', 'protein'])
    expect(goalProgress(LUNCH, OCTOBER).map((ring) => ring.key)).toEqual([
      'kcal',
      'protein',
      'carbs',
      'fat',
    ])
    expect(goalProgress(LUNCH, { ...SEPTEMBER, proteinG: null }).map((ring) => ring.key)).toEqual([
      'kcal',
    ])
  })

  test('calories use the rounded-up value, so the ring matches what is displayed', () => {
    const [kcal] = goalProgress(LUNCH, SEPTEMBER)

    expect(kcal).toEqual({
      key: 'kcal',
      consumed: 913,
      target: 2000,
      ratio: 0.4565,
      remaining: 1087,
      reached: false,
      incomplete: false,
      estimated: false,
    })
  })

  test('estimated calories make the calorie ring an estimate, not the macros', () => {
    const [kcal, protein] = goalProgress({ ...LUNCH, estimated: true }, SEPTEMBER)

    expect(kcal).toMatchObject({ key: 'kcal', consumed: 913, estimated: true })
    expect(protein).toMatchObject({ key: 'protein', estimated: false })
  })

  test('nutrient rings report progress, overshoot and missing data', () => {
    const [, protein, carbs] = goalProgress(LUNCH, { ...OCTOBER, proteinG: 50 })

    expect(protein).toMatchObject({
      consumed: 55,
      target: 50,
      ratio: 1.1,
      remaining: -5,
      reached: true,
    })
    expect(carbs).toMatchObject({ consumed: 50, target: 200, ratio: 0.25, incomplete: true })
  })

  test('fiber gets a ring once it has a target; unknown fiber makes it a lower bound', () => {
    const fiber = goalProgress(LUNCH, { ...SEPTEMBER, fiberG: 30, weightGoalKg: null }).find(
      (ring) => ring.key === 'fiber',
    )

    expect(goalProgress(LUNCH, SEPTEMBER).some((ring) => ring.key === 'fiber')).toBe(false)
    expect(fiber).toMatchObject({ consumed: 0, target: 30, incomplete: true })
  })

  test('a zero target counts as reached without dividing by zero', () => {
    const [, protein] = goalProgress(LUNCH, { ...SEPTEMBER, proteinG: 0 })

    expect(protein).toMatchObject({ ratio: 1, reached: true })
  })
})
