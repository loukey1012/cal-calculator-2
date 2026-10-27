import { describe, expect, test } from 'vitest'
import type { Goal } from '../nutrition/goals'
import {
  addDays,
  availableMetrics,
  nutritionBars,
  nutritionSummary,
  rangeBounds,
  weightPoints,
  weightSummary,
  type NutritionDay,
} from './trends'

const GOAL: Goal = {
  validFrom: '2026-01-01',
  kcal: 2000,
  proteinG: 120,
  carbsG: null,
  fatG: null,
  fiberG: 30,
  weightGoalKg: 68,
}

const TODAY = '2026-10-19'

/** a complete day: lunch and dinner logged */
function day(date: string, kcal: number, protein = 100, estimated = false): NutritionDay {
  return {
    date,
    kcal,
    protein,
    carbs: 0,
    fat: 0,
    fiber: 20,
    estimated,
    mealCount: 3,
    lunchLogged: true,
    dinnerLogged: true,
  }
}

describe("days that don't count", () => {
  const days = [
    { ...day('2026-10-04', 3200), alcoholDay: true },
    day('2026-10-05', 1800),
    { ...day('2026-10-06', 3500), cheatDay: true },
    { ...day('2026-10-07', 600), cheatMeal: true },
    { ...day('2026-10-08', 700), dinnerLogged: false },
    { ...day(TODAY, 400), dinnerLogged: false },
  ]

  test('still get a bar, marked by why they are left out', () => {
    const bars = nutritionBars(days, 'kcal', '4w', [GOAL], TODAY)

    expect(bars.map((bar) => [bar.start, bar.kind, bar.value, bar.days])).toEqual([
      ['2026-10-04', 'alcoholDay', 3200, 0],
      ['2026-10-05', 'counted', 1800, 1],
      ['2026-10-06', 'cheatDay', 3500, 0],
      ['2026-10-07', 'cheatMeal', 600, 0],
      ['2026-10-08', 'missing', 700, 0],
      [TODAY, 'today', 400, 0],
    ])
  })

  test('are left out of the averages, goal days and the range before', () => {
    const before = [{ ...day('2026-09-30', 500), cheatMeal: true }, day('2026-10-01', 2100)]

    expect(nutritionSummary(days, before, 'kcal', [GOAL], TODAY)).toEqual({
      average: 1800,
      loggedDays: 1,
      goalDays: 1,
      previousAverage: 2100,
    })
  })

  test('weekly bars average only the counted days', () => {
    const bars = nutritionBars(days, 'kcal', '6m', [GOAL], TODAY)

    expect(bars).toEqual([expect.objectContaining({ start: '2026-10-05', value: 1800, days: 1 })])
  })
})

describe('ranges', () => {
  test('a range ends today; the one before it ends the day before it starts', () => {
    expect(rangeBounds('4w', '2026-10-08')).toEqual({
      first: '2026-09-11',
      last: '2026-10-08',
      previousFirst: '2026-08-14',
      previousLast: '2026-09-10',
    })
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
  })

  test('the week is the current calendar week, Monday to Sunday, compared with last week', () => {
    // Thursday, October 8
    expect(rangeBounds('week', '2026-10-08')).toEqual({
      first: '2026-10-05',
      last: '2026-10-11',
      previousFirst: '2026-09-28',
      previousLast: '2026-10-04',
    })
    // a Sunday still belongs to its week, a Monday starts a new one
    expect(rangeBounds('week', '2026-10-11').first).toBe('2026-10-05')
    expect(rangeBounds('week', '2026-10-12').first).toBe('2026-10-12')
  })
})

describe('availableMetrics', () => {
  test('calories, the nutrients with a goal, and weight with a goal or entries', () => {
    expect(availableMetrics(GOAL, false)).toEqual(['kcal', 'protein', 'fiber', 'weight'])
    expect(availableMetrics({ ...GOAL, weightGoalKg: null }, false)).toEqual([
      'kcal',
      'protein',
      'fiber',
    ])
    expect(availableMetrics({ ...GOAL, weightGoalKg: null }, true)).toContain('weight')
    expect(availableMetrics(null, false)).toEqual(['kcal'])
  })
})

describe('nutritionBars', () => {
  test('short ranges: one bar per logged day with that day’s goal; empty days have none', () => {
    const days = [
      day('2026-10-01', 1800),
      { ...day('2026-10-02', 0), mealCount: 0 },
      day('2026-10-03', 2100, 90, true),
    ]

    expect(nutritionBars(days, 'kcal', '4w', [GOAL], TODAY)).toEqual([
      {
        start: '2026-10-01',
        end: '2026-10-01',
        value: 1800,
        goal: 2000,
        estimated: false,
        days: 1,
        kind: 'counted',
      },
      {
        start: '2026-10-03',
        end: '2026-10-03',
        value: 2100,
        goal: 2000,
        estimated: true,
        days: 1,
        kind: 'counted',
      },
    ])
  })

  test('long ranges: one bar per week (Monday to Sunday), the average of its logged days', () => {
    const days = [day('2026-09-28', 1800), day('2026-09-30', 2200), day('2026-10-05', 2000)]

    expect(nutritionBars(days, 'kcal', '6m', [GOAL], TODAY)).toEqual([
      {
        start: '2026-09-28',
        end: '2026-10-04',
        value: 2000,
        goal: 2000,
        estimated: false,
        days: 2,
        kind: 'counted',
      },
      {
        start: '2026-10-05',
        end: '2026-10-11',
        value: 2000,
        goal: 2000,
        estimated: false,
        days: 1,
        kind: 'counted',
      },
    ])
  })

  test('the goal follows the goal history', () => {
    const october = { ...GOAL, validFrom: '2026-10-02', kcal: 1800 }

    const bars = nutritionBars(
      [day('2026-10-01', 1900), day('2026-10-02', 1900)],
      'kcal',
      '4w',
      [GOAL, october],
      TODAY,
    )

    expect(bars.map((bar) => bar.goal)).toEqual([2000, 1800])
  })
})

describe('nutritionSummary', () => {
  test('average per logged day, days at goal, and the range before', () => {
    const days = [day('2026-10-01', 1700, 130), day('2026-10-02', 2300, 100)]
    const before = [day('2026-09-01', 2100)]

    expect(nutritionSummary(days, before, 'kcal', [GOAL], TODAY)).toEqual({
      average: 2000,
      loggedDays: 2,
      goalDays: 1,
      previousAverage: 2100,
    })
    // protein counts as reached at or above the target
    expect(nutritionSummary(days, [], 'protein', [GOAL], TODAY)).toMatchObject({
      average: 115,
      goalDays: 1,
      previousAverage: null,
    })
  })

  test('calories up to 110 % of the goal count as within it', () => {
    const near = [day('2026-10-01', 2200), day('2026-10-02', 2201), day('2026-10-03', 2199.5)]

    expect(nutritionSummary(near, [], 'kcal', [GOAL], TODAY).goalDays).toBe(2)
  })

  test('nothing logged', () => {
    expect(nutritionSummary([], [], 'kcal', [GOAL], TODAY)).toEqual({
      average: null,
      loggedDays: 0,
      goalDays: 0,
      previousAverage: null,
    })
  })
})

describe('weight', () => {
  const ENTRIES = [
    { date: '2026-08-20', weightKg: 74 },
    { date: '2026-09-20', weightKg: 73.2 },
    { date: '2026-10-05', weightKg: 71.9 },
  ]

  test('the points of a range start with the weight that applied on its first day', () => {
    expect(weightPoints(ENTRIES, '2026-09-11', '2026-10-08')).toEqual([
      { date: '2026-09-11', weightKg: 74, carried: true },
      { date: '2026-09-20', weightKg: 73.2, carried: false },
      { date: '2026-10-05', weightKg: 71.9, carried: false },
    ])
    expect(weightPoints(ENTRIES, '2026-08-01', '2026-08-10')).toEqual([])
  })

  test('current weight, change over the range, and how far to the goal', () => {
    expect(weightSummary(ENTRIES, '2026-09-11', '2026-10-08', 68)).toEqual({
      current: 71.9,
      change: -2.1,
      toGo: 3.9,
    })
    expect(weightSummary(ENTRIES, '2026-09-11', '2026-10-08', null)).toMatchObject({ toGo: null })
    expect(weightSummary([], '2026-09-11', '2026-10-08', 68)).toEqual({
      current: null,
      change: null,
      toGo: null,
    })
  })
})
