import { describe, expect, test } from 'vitest'
import type { DayTotal } from './calendar'
import {
  filterMatches,
  monthFilterOf,
  monthGoalStats,
  noteDatesOf,
  weightChangeInMonth,
  type MonthNote,
} from './monthStats'

const GOAL = {
  validFrom: '2026-09-01',
  kcal: 2000,
  proteinG: null,
  carbsG: null,
  fatG: null,
  fiberG: null,
  weightGoalKg: null,
}
const TODAY = '2026-10-20'

function day(date: string, kcal: number, extra: Partial<DayTotal> = {}): DayTotal {
  return {
    date,
    kcal,
    protein: 0,
    mealCount: 3,
    kcalEstimated: false,
    lunchLogged: true,
    dinnerLogged: true,
    ...extra,
  }
}

describe('monthGoalStats', () => {
  test('counts days within goal among the counted days that had a goal', () => {
    const totals = [day('2026-10-01', 1900), day('2026-10-02', 2600), day('2026-10-03', 2100)]
    const stats = monthGoalStats(totals, [GOAL], TODAY)
    expect(stats.withinGoal).toBe(2)
    expect(stats.judgedDays).toBe(3)
  })

  test('leaves out days that do not count and days without a goal', () => {
    const totals = [
      day('2026-10-01', 1900),
      day('2026-10-02', 1900, { alcoholDay: true }),
      day('2026-10-03', 1900, { dinnerLogged: false }),
      day('2026-10-20', 1900),
      day('2026-08-30', 1900),
    ]
    const stats = monthGoalStats(totals, [{ ...GOAL, validFrom: '2026-10-01' }], TODAY)
    expect(stats.judgedDays).toBe(1)
    expect(stats.withinGoal).toBe(1)
  })

  test('reports no judged days for an empty month or without goals', () => {
    expect(monthGoalStats([], [GOAL], TODAY)).toEqual({
      withinGoal: 0,
      judgedDays: 0,
      longestStreak: 0,
    })
    expect(monthGoalStats([day('2026-10-01', 1900)], [], TODAY).judgedDays).toBe(0)
  })

  test('the longest streak passes over days that do not count and breaks on a day over goal', () => {
    const totals = [
      day('2026-10-01', 1900),
      day('2026-10-02', 1900),
      // not counted: neither breaks nor extends
      day('2026-10-03', 5000, { cheatDay: true }),
      day('2026-10-04', 1900, { lunchLogged: false }),
      day('2026-10-05', 1900),
      // over goal breaks
      day('2026-10-06', 2500),
      day('2026-10-07', 1900),
      day('2026-10-08', 1900),
    ]
    // 1, 2, 5 = 3; then 7, 8 = 2
    expect(monthGoalStats(totals, [GOAL], TODAY).longestStreak).toBe(3)
  })

  test('today and later days neither extend nor break a streak', () => {
    const totals = [day('2026-10-18', 1900), day('2026-10-19', 1900), day('2026-10-20', 5000)]
    expect(monthGoalStats(totals, [GOAL], TODAY).longestStreak).toBe(2)
  })

  test('up to 10 % over still counts as within goal', () => {
    expect(monthGoalStats([day('2026-10-01', 2200)], [GOAL], TODAY).longestStreak).toBe(1)
  })
})

describe('weightChangeInMonth', () => {
  const entries = [
    { date: '2026-09-28', weightKg: 80 },
    { date: '2026-10-03', weightKg: 78.4 },
    { date: '2026-10-30', weightKg: 77.2 },
    { date: '2026-11-02', weightKg: 70 },
  ]

  test('is the last weigh-in of the month minus the first', () => {
    expect(weightChangeInMonth(entries, '2026-10-01')).toBeCloseTo(-1.2)
  })

  test('is null with fewer than two weigh-ins in the month', () => {
    expect(weightChangeInMonth(entries, '2026-09-01')).toBeNull()
    expect(weightChangeInMonth(entries, '2026-12-01')).toBeNull()
  })

  test('does not depend on the order of the entries', () => {
    expect(weightChangeInMonth([...entries].reverse(), '2026-10-01')).toBeCloseTo(-1.2)
  })
})

describe('notes and filters', () => {
  const notes: MonthNote[] = [
    { date: '2026-10-03', mealType: null, text: 'Birthday' },
    { date: '2026-10-03', mealType: 'dinner', text: 'Pizza' },
    { date: '2026-10-05', mealType: 'lunch', text: 'Out' },
  ]

  test('lists the days with a note once each', () => {
    expect(noteDatesOf(notes)).toEqual(new Set(['2026-10-03', '2026-10-05']))
  })

  test('matches days by their status or note', () => {
    expect(filterMatches('notes', 'logged', true)).toBe(true)
    expect(filterMatches('notes', 'logged', false)).toBe(false)
    expect(
      filterMatches('alcohol', 'alcoholDay', false, day('2026-10-01', 0, { alcoholDay: true })),
    ).toBe(true)
    expect(
      filterMatches('alcohol', 'cheatDay', false, day('2026-10-01', 0, { cheatDay: true })),
    ).toBe(false)
    expect(filterMatches('alcohol', 'none', false)).toBe(false)
    expect(
      filterMatches('cheat', 'cheatDay', false, day('2026-10-01', 0, { cheatDay: true })),
    ).toBe(true)
    expect(
      filterMatches('cheat', 'cheatMeal', false, day('2026-10-01', 0, { cheatMeal: true })),
    ).toBe(true)
    // the status shows alcohol first, the flags still say there was a cheat meal
    expect(
      filterMatches(
        'cheat',
        'alcoholDay',
        false,
        day('2026-10-01', 0, { alcoholDay: true, cheatMeal: true }),
      ),
    ).toBe(true)
    expect(
      filterMatches('cheat', 'alcoholDay', false, day('2026-10-01', 0, { alcoholDay: true })),
    ).toBe(false)
    expect(filterMatches('missing', 'missing', false)).toBe(true)
    expect(filterMatches('missing', 'none', false)).toBe(false)
  })

  test('reads the filter from navigation state defensively', () => {
    expect(monthFilterOf({ filter: 'cheat' })).toBe('cheat')
    expect(monthFilterOf({ filter: 'bogus' })).toBeNull()
    expect(monthFilterOf({ filter: 3 })).toBeNull()
    expect(monthFilterOf({})).toBeNull()
    expect(monthFilterOf(null)).toBeNull()
    expect(monthFilterOf('x')).toBeNull()
  })
})
