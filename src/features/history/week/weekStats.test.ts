import { describe, expect, test } from 'vitest'
import type { Goal } from '../../nutrition/goals'
import {
  countingSummary,
  dailyBudget,
  extremes,
  mealAverages,
  savedKcal,
  topFoods,
  withinGoal,
  weekAverages,
  type WeekDay,
} from './weekStats'

const TODAY = '2026-10-28'
const WEEK = [
  '2026-10-26',
  '2026-10-27',
  '2026-10-28',
  '2026-10-29',
  '2026-10-30',
  '2026-10-31',
  '2026-11-01',
]
const PAST_WEEK = [
  '2026-10-19',
  '2026-10-20',
  '2026-10-21',
  '2026-10-22',
  '2026-10-23',
  '2026-10-24',
  '2026-10-25',
]

const GOAL: Goal = {
  validFrom: '2026-10-01',
  kcal: 2000,
  proteinG: 100,
  carbsG: null,
  fatG: 70,
  fiberG: null,
  weightGoalKg: null,
}

function day(date: string, kcal: number, overrides: Partial<WeekDay> = {}): WeekDay {
  return {
    date,
    kcal,
    protein: 80,
    carbs: 200,
    fat: 60,
    fiber: 20,
    mealCount: 3,
    kcalEstimated: false,
    cheatDay: false,
    cheatMeal: false,
    alcoholDay: false,
    lunchLogged: true,
    dinnerLogged: true,
    ...overrides,
  }
}

const BURNED = 2500

describe('savedKcal', () => {
  test('sums burned minus eaten over counted days', () => {
    const days = [day('2026-10-19', 2000), day('2026-10-20', 1800), day('2026-10-21', 2600)]

    expect(savedKcal(days, BURNED, TODAY)).toEqual({
      saved: 500 + 700 - 100,
      burned: 7500,
      eaten: 6400,
      days: 3,
    })
  })

  test('a surplus is negative', () => {
    expect(savedKcal([day('2026-10-19', 3700)], BURNED, TODAY)?.saved).toBe(-1200)
  })

  test('rounds each day up like the displayed calories', () => {
    expect(savedKcal([day('2026-10-19', 1999.2)], BURNED, TODAY)?.eaten).toBe(2000)
  })

  test('never takes cheat days, alcohol days, cheat meals, missing meals or today', () => {
    const days = [
      day('2026-10-19', 2000),
      day('2026-10-20', 5000, { cheatDay: true }),
      day('2026-10-21', 5000, { alcoholDay: true }),
      day('2026-10-22', 5000, { cheatMeal: true }),
      day('2026-10-23', 500, { dinnerLogged: false }),
      day('2026-10-24', 500, { lunchLogged: false }),
      day('2026-10-25', 0, { mealCount: 0 }),
      day(TODAY, 900),
    ]

    expect(savedKcal(days, BURNED, TODAY)).toEqual({
      saved: 500,
      burned: 2500,
      eaten: 2000,
      days: 1,
    })
  })

  test('the one figure holds for every day, however far back', () => {
    const days = [day('2025-12-01', 2000), day('2026-10-20', 2000)]

    expect(savedKcal(days, 3000, TODAY)).toMatchObject({ burned: 6000, days: 2 })
  })

  test('is null when nothing counts or no figure is set', () => {
    expect(savedKcal([], BURNED, TODAY)).toBeNull()
    expect(savedKcal([day('2026-10-19', 2000)], null, TODAY)).toBeNull()
    expect(savedKcal([day('2026-10-20', 1, { cheatDay: true })], BURNED, TODAY)).toBeNull()
  })
})

describe('dailyBudget', () => {
  test('spreads what is left of the week over today and the days after', () => {
    // counted: Mon 2000 + Tue 1800 = 3800; 7 days of 2000 = 14000; left 10200 over 5 days
    const days = [day('2026-10-26', 2000), day('2026-10-27', 1800)]

    expect(dailyBudget(days, [GOAL], TODAY, WEEK)).toEqual({ daysLeft: 5, perDay: 2040 })
  })

  test('leaves cheat, alcohol and unfinished days out of the eaten part and the days', () => {
    const days = [
      day('2026-10-26', 2000),
      day('2026-10-27', 9000, { alcoholDay: true }),
      day(TODAY, 700),
    ]

    // counted 1 day, eaten 2000: (2000 * (1 + 5) - 2000) / 5
    expect(dailyBudget(days, [GOAL], TODAY, WEEK)).toEqual({ daysLeft: 5, perDay: 2000 })
  })

  test("takes the goal of each counted day, and today's for the days left", () => {
    const later = { ...GOAL, validFrom: '2026-10-27', kcal: 2400 }
    const days = [day('2026-10-26', 2000), day('2026-10-27', 1900)]

    // goals 2000 + 2400, then 5 days of 2400: (16400 - 3900) / 5
    expect(dailyBudget(days, [GOAL, later], TODAY, WEEK)).toEqual({ daysLeft: 5, perDay: 2500 })
  })

  test('rounds down so the budget is never overspent', () => {
    const days = [day('2026-10-26', 2001), day('2026-10-27', 2000)]

    // (2000 * 7 - 4001) / 5 = 1999.8
    expect(dailyBudget(days, [GOAL], TODAY, WEEK)?.perDay).toBe(1999)
  })

  test('can be nothing left', () => {
    const days = [day('2026-10-26', 8000), day('2026-10-27', 8000)]

    expect(dailyBudget(days, [GOAL], TODAY, WEEK)?.perDay).toBeLessThanOrEqual(0)
  })

  test('is null without a goal or on a week that is over', () => {
    expect(dailyBudget([], [], TODAY, WEEK)).toBeNull()
    expect(dailyBudget([], [GOAL], TODAY, PAST_WEEK)).toBeNull()
  })

  test('counts the last day of the week as one day left', () => {
    expect(dailyBudget([], [GOAL], '2026-11-01', WEEK)).toEqual({ daysLeft: 1, perDay: 2000 })
  })
})

describe('weekAverages', () => {
  test('averages counted days and pairs each nutrient with its goal', () => {
    const counted = [day('2026-10-19', 2000), day('2026-10-20', 1000, { protein: 40 })]

    const result = weekAverages(counted, [GOAL])

    expect(result?.kcal).toEqual({ average: 1500, goal: 2000 })
    expect(result?.nutrients.map((n) => n.key)).toEqual(['protein', 'fat'])
    expect(result?.nutrients[0]).toEqual({ key: 'protein', average: 60, goal: 100 })
  })

  test('sets each counted day against the goal valid that day', () => {
    const later = { ...GOAL, validFrom: '2026-10-20', kcal: 2400, proteinG: 120 }
    const counted = [day('2026-10-19', 2000), day('2026-10-20', 2000)]

    const result = weekAverages(counted, [GOAL, later])

    // (2000 + 2400) / 2; protein (100 + 120) / 2
    expect(result?.kcal).toEqual({ average: 2000, goal: 2200 })
    expect(result?.nutrients[0]).toEqual({ key: 'protein', average: 80, goal: 110 })
  })

  test('rounds the average goal to whole calories', () => {
    const later = { ...GOAL, validFrom: '2026-10-20', kcal: 2001 }
    const counted = [day('2026-10-19', 2000), day('2026-10-20', 2000)]

    expect(weekAverages(counted, [GOAL, later])?.kcal.goal).toBe(2001)
  })

  test('is null when no day counts', () => {
    expect(weekAverages([], [GOAL])).toBeNull()
  })

  test('without a goal there is only the calorie average', () => {
    const result = weekAverages([day('2026-10-19', 2000)], [])

    expect(result).toEqual({ kcal: { average: 2000, goal: null }, nutrients: [] })
  })
})

describe('withinGoal', () => {
  test('counts days judged within the goal', () => {
    const counted = [day('2026-10-19', 2000), day('2026-10-20', 2100), day('2026-10-21', 2900)]

    expect(withinGoal(counted, [GOAL])).toEqual({ within: 2, of: 3 })
  })

  test('is null without a goal', () => {
    expect(withinGoal([day('2026-10-19', 2000)], [])).toBeNull()
  })
})

describe('extremes', () => {
  test('finds the highest and lowest day', () => {
    const counted = [day('2026-10-19', 1900), day('2026-10-20', 2300), day('2026-10-21', 1500)]

    expect(extremes(counted)).toEqual({ highest: counted[1], lowest: counted[2] })
  })

  test('needs at least two days to tell them apart', () => {
    expect(extremes([day('2026-10-19', 1900)])).toBeNull()
    expect(extremes([])).toBeNull()
  })
})

describe('mealAverages', () => {
  test('averages each meal over the counted days, a day without it counting zero', () => {
    const counted = [day('2026-10-19', 2000), day('2026-10-20', 2000)]
    const meals = [
      { date: '2026-10-19', mealType: 'lunch' as const, kcal: 800 },
      { date: '2026-10-20', mealType: 'lunch' as const, kcal: 600 },
      { date: '2026-10-19', mealType: 'snack' as const, kcal: 200 },
      { date: '2026-10-21', mealType: 'dinner' as const, kcal: 9999 },
    ]

    const result = mealAverages(meals, counted)

    expect(result.map((entry) => [entry.mealType, entry.average])).toEqual([
      ['breakfast', 0],
      ['lunch', 700],
      ['dinner', 0],
      ['snack', 100],
    ])
  })

  test('is empty when no day counts', () => {
    expect(mealAverages([{ date: '2026-10-19', mealType: 'lunch', kcal: 1 }], [])).toEqual([])
  })
})

describe('topFoods', () => {
  const counted = [day('2026-10-19', 1), day('2026-10-20', 1), day('2026-10-21', 1)]

  test('ranks foods by the days they were eaten on, once per day', () => {
    const foods = [
      { date: '2026-10-19', name: 'Oats' },
      { date: '2026-10-19', name: 'oats ' },
      { date: '2026-10-20', name: 'Oats' },
      { date: '2026-10-21', name: 'Oats' },
      { date: '2026-10-19', name: 'Apple' },
      { date: '2026-10-20', name: 'Apple' },
      { date: '2026-10-19', name: 'Cheese' },
    ]

    expect(topFoods(foods, counted, 5)).toEqual([
      { name: 'Oats', days: 3 },
      { name: 'Apple', days: 2 },
    ])
  })

  test('ignores days that do not count and limits the list', () => {
    const foods = [
      { date: '2026-10-19', name: 'Beer' },
      { date: '2026-10-22', name: 'Beer' },
      { date: '2026-10-23', name: 'Beer' },
      ...['A', 'B', 'C', 'D', 'E', 'F'].flatMap((name) => [
        { date: '2026-10-19', name },
        { date: '2026-10-20', name },
      ]),
    ]

    const result = topFoods(foods, counted, 5)

    expect(result).toHaveLength(5)
    expect(result.map((food) => food.name)).not.toContain('Beer')
  })
})

describe('countingSummary', () => {
  function summarise(totals: Record<string, WeekDay>, today = TODAY) {
    return countingSummary(WEEK, new Map(Object.entries(totals)), today)
  }

  test('names what counted and what did not', () => {
    const result = countingSummary(
      PAST_WEEK,
      new Map(
        [
          day('2026-10-19', 2000),
          day('2026-10-20', 2000),
          day('2026-10-21', 2000, { alcoholDay: true }),
          day('2026-10-22', 2000, { cheatDay: true }),
          day('2026-10-23', 2000, { cheatMeal: true }),
          day('2026-10-24', 2000, { dinnerLogged: false }),
          day('2026-10-25', 2000, { lunchLogged: false }),
        ].map((total) => [total.date, total]),
      ),
      TODAY,
    )

    expect(result).toEqual([
      '2 counted',
      '1 alcohol day',
      '1 cheat day',
      '1 cheat meal',
      '1 lunch missing',
      '1 dinner missing',
    ])
  })

  test('a day with nothing logged is missing both meals, shown once', () => {
    const result = countingSummary(['2026-10-19'], new Map(), TODAY)

    expect(result).toEqual(['0 counted', '1 day without lunch and dinner'])
  })

  test('the running week notes today and ignores days to come', () => {
    const result = summarise({ '2026-10-26': day('2026-10-26', 2000), [TODAY]: day(TODAY, 900) })

    expect(result).toEqual(['1 counted', '1 day without lunch and dinner', 'today, not over yet'])
  })

  test('pluralises', () => {
    const result = countingSummary(
      PAST_WEEK,
      new Map([
        ['2026-10-19', day('2026-10-19', 1, { alcoholDay: true })],
        ['2026-10-20', day('2026-10-20', 1, { alcoholDay: true })],
      ]),
      TODAY,
    )

    expect(result).toContain('2 alcohol days')
  })
})
