import { describe, expect, test } from 'vitest'
import {
  addMonths,
  dayStatus,
  monthWeeks,
  monthRange,
  monthStart,
  monthSummary,
  weekAverageKcal,
  weekEdgeRanges,
  type DayTotal,
} from './calendar'

const GOAL = {
  validFrom: '2026-09-01',
  kcal: 2000,
  proteinG: 120,
  carbsG: null,
  fatG: null,
  fiberG: null,
  weightGoalKg: null,
}

describe('months', () => {
  test('start, range and stepping across years', () => {
    expect(monthStart('2026-10-17')).toBe('2026-10-01')
    expect(monthRange('2026-02-01')).toEqual({ first: '2026-02-01', last: '2026-02-28' })
    expect(addMonths('2026-12-01', 1)).toBe('2027-01-01')
    expect(addMonths('2026-01-01', -1)).toBe('2025-12-01')
  })

  test('the weeks are Monday-first and run on into the neighbouring months', () => {
    // 1 October 2026 is a Thursday
    const weeks = monthWeeks('2026-10-01')

    expect(weeks).toHaveLength(5)
    expect(weeks[0]).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ])
    expect(weeks.at(-1)).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ])
  })

  test('a month that starts on a Monday and ends on a Sunday has no days of its neighbours', () => {
    // February 2027: Monday 1st to Sunday 28th
    const weeks = monthWeeks('2027-02-01')

    expect(weeks).toHaveLength(4)
    expect(weeks[0]?.[0]).toBe('2027-02-01')
    expect(weeks.at(-1)?.[6]).toBe('2027-02-28')
    expect(weekEdgeRanges('2027-02-01')).toEqual([])
  })

  test('the edge ranges are the days of the first and last week that lie outside the month', () => {
    expect(weekEdgeRanges('2026-10-01')).toEqual([
      { first: '2026-09-28', last: '2026-09-30' },
      { first: '2026-11-01', last: '2026-11-01' },
    ])
  })
})

const TODAY = '2026-10-19'

/** a complete day (lunch and dinner logged) */
function total(overrides: Partial<DayTotal> = {}): DayTotal {
  return {
    date: '2026-10-15',
    kcal: 1800,
    protein: 80,
    mealCount: 3,
    kcalEstimated: false,
    lunchLogged: true,
    dinnerLogged: true,
    ...overrides,
  }
}

const statusOf = (day: DayTotal | undefined, date = day?.date ?? '2026-10-15') =>
  dayStatus(date, day, [GOAL], TODAY)

describe('dayStatus', () => {
  test('within the calorie goal, over it, logged without a goal, or nothing logged', () => {
    expect(statusOf(total({ kcal: 1999.2 }))).toBe('onTarget')
    expect(statusOf(total({ kcal: 2200 }))).toBe('onTarget')
    expect(statusOf(total({ kcal: 2201 }))).toBe('over')
    expect(statusOf(total({ date: '2026-08-01', kcal: 500 }))).toBe('logged')
    expect(statusOf(undefined, '2026-09-30')).toBe('none')
  })

  test('over the goal: more than 10 % is over, more than 300 kcal well over (like the rings)', () => {
    expect(statusOf(total({ kcal: 2200.6 }))).toBe('over')
    expect(statusOf(total({ kcal: 2300 }))).toBe('over')
    expect(statusOf(total({ kcal: 2300.6 }))).toBe('wellOver')
    expect(statusOf(total({ kcal: 3000 }))).toBe('wellOver')
  })

  test('a past day since tracking started without lunch or dinner is missing a meal', () => {
    expect(statusOf(total({ dinnerLogged: false, kcal: 900 }))).toBe('missing')
    expect(statusOf(undefined, '2026-10-12')).toBe('missing')
    // today isn't over yet, and days before tracking started aren't flagged
    expect(statusOf(total({ date: TODAY, dinnerLogged: false }))).toBe('onTarget')
    expect(statusOf(total({ date: '2026-10-01', lunchLogged: false }))).toBe('onTarget')
  })

  test('a cheat day or a day with a cheat meal is never over or missing, logged or not', () => {
    const over = total({ kcal: 3000, lunchLogged: false })

    expect(statusOf({ ...over, cheatDay: true })).toBe('cheatDay')
    expect(statusOf({ ...over, mealCount: 0, kcal: 0, cheatDay: true })).toBe('cheatDay')
    expect(statusOf({ ...over, cheatMeal: true })).toBe('cheatMeal')
    expect(statusOf({ ...over, mealCount: 0, kcal: 0, cheatMeal: true })).toBe('cheatMeal')
    // both: the cheat day says more
    expect(statusOf({ ...over, cheatMeal: true, cheatDay: true })).toBe('cheatDay')
  })

  test('an alcohol day is never over or missing, logged or not; a cheat meal inside it changes nothing', () => {
    const over = total({ kcal: 3000, lunchLogged: false })

    expect(statusOf({ ...over, alcoholDay: true })).toBe('alcoholDay')
    expect(statusOf({ ...over, mealCount: 0, kcal: 0, alcoholDay: true })).toBe('alcoholDay')
    expect(statusOf({ ...over, alcoholDay: true, cheatMeal: true })).toBe('alcoholDay')
  })
})

describe('monthSummary', () => {
  test('averages over the complete past days', () => {
    expect(
      monthSummary(
        [
          total({ date: '2026-10-01', kcal: 2000, protein: 100 }),
          total({ date: '2026-10-02', kcal: 1000, protein: 50 }),
          total({ date: '2026-10-03', kcal: 0, protein: 0, mealCount: 0 }),
        ],
        TODAY,
      ),
    ).toEqual({
      loggedDays: 2,
      leftOutDays: 0,
      averageKcal: 1500,
      averageProtein: 75,
      estimated: false,
    })
    expect(monthSummary([], TODAY)).toEqual({
      loggedDays: 0,
      leftOutDays: 0,
      averageKcal: 0,
      averageProtein: 0,
      estimated: false,
    })
  })

  test('cheat days, days with a cheat meal and days missing a meal are left out; today too', () => {
    const summary = monthSummary(
      [
        total({ date: '2026-10-01', kcal: 2000, protein: 100 }),
        total({ date: '2026-10-02', kcal: 4000, kcalEstimated: true, cheatDay: true }),
        total({ date: '2026-10-03', kcal: 300, cheatMeal: true }),
        total({ date: '2026-10-04', kcal: 0, mealCount: 0, cheatDay: true }),
        total({ date: '2026-10-05', kcal: 0, mealCount: 0, alcoholDay: true }),
        total({ date: '2026-10-12', kcal: 700, dinnerLogged: false }),
        // today is still going: neither counted nor left out
        total({ date: TODAY, kcal: 400, dinnerLogged: false }),
      ],
      TODAY,
    )

    expect(summary).toEqual({
      loggedDays: 1,
      leftOutDays: 5,
      averageKcal: 2000,
      averageProtein: 100,
      estimated: false,
    })
  })

  test('one logged day with estimated calories makes the average an estimate', () => {
    const summary = monthSummary(
      [
        total({ date: '2026-10-01', kcal: 2000, kcalEstimated: true }),
        total({ date: '2026-10-02', kcal: 1000 }),
      ],
      TODAY,
    )

    expect(summary).toMatchObject({ averageKcal: 1500, estimated: true })
  })
})

describe('weekAverageKcal', () => {
  const day = (date: string, kcal: number, extra: Partial<DayTotal> = {}): DayTotal => ({
    date,
    kcal,
    protein: 0,
    mealCount: 3,
    kcalEstimated: false,
    lunchLogged: true,
    dinnerLogged: true,
    ...extra,
  })
  const week = [
    '2026-10-12',
    '2026-10-13',
    '2026-10-14',
    '2026-10-15',
    '2026-10-16',
    '2026-10-17',
    '2026-10-18',
  ]
  const byDate = (days: DayTotal[]) => new Map(days.map((total) => [total.date, total]))

  test('averages only the days that count', () => {
    const totals = byDate([
      day('2026-10-12', 1800),
      day('2026-10-13', 2200),
      day('2026-10-14', 5000, { cheatDay: true }),
      day('2026-10-15', 5000, { alcoholDay: true }),
      day('2026-10-16', 5000, { cheatMeal: true }),
      day('2026-10-17', 300, { dinnerLogged: false }),
    ])

    expect(weekAverageKcal(week, totals, '2026-10-18')).toBe(2000)
  })

  test('leaves out today, which is still being logged', () => {
    const totals = byDate([day('2026-10-12', 1800), day('2026-10-13', 3000)])

    expect(weekAverageKcal(week, totals, '2026-10-13')).toBe(1800)
  })

  test('is null when no day of the week counts, or the week has blanks only', () => {
    expect(weekAverageKcal(week, byDate([]), '2026-10-30')).toBeNull()
    expect(weekAverageKcal([null, null, '2026-10-01'], byDate([]), '2026-10-30')).toBeNull()
  })
})
