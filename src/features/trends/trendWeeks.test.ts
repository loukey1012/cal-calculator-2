import { describe, expect, test } from 'vitest'
import { rangeBounds, type NutritionDay } from './trends'
import { loggedWeeks, newerWeek, olderWeek, weekNumber } from './trendWeeks'

const TODAY = '2026-10-21' // a Wednesday; its week starts on Monday, October 19

function day(date: string, overrides: Partial<NutritionDay> = {}): NutritionDay {
  return {
    date,
    kcal: 2000,
    protein: 100,
    carbs: 0,
    fat: 0,
    fiber: 0,
    estimated: false,
    mealCount: 3,
    lunchLogged: true,
    dinnerLogged: true,
    ...overrides,
  }
}

describe('loggedWeeks', () => {
  test('every week with an entry, newest first, and the current week always', () => {
    const weeks = loggedWeeks(
      [
        day('2026-10-06', { kcal: 1800 }),
        day('2026-10-08', { kcal: 2200 }),
        day('2026-09-29'),
        // nothing logged that week: an empty meal only
        day('2026-09-16', { mealCount: 0 }),
      ],
      TODAY,
    )

    expect(weeks.map((week) => week.monday)).toEqual(['2026-10-19', '2026-10-05', '2026-09-28'])
    expect(weeks[1]).toEqual({ monday: '2026-10-05', average: 2000 })
    // nothing counted yet this week
    expect(weeks[0]).toEqual({ monday: '2026-10-19', average: null })
  })

  test('a cheat day is an entry, but the week’s average leaves it out', () => {
    const weeks = loggedWeeks(
      [
        day('2026-10-13', { cheatDay: true, mealCount: 0, kcal: 0 }),
        day('2026-10-14', { kcal: 1700 }),
      ],
      TODAY,
    )

    expect(weeks).toEqual([
      { monday: '2026-10-19', average: null },
      { monday: '2026-10-12', average: 1700 },
    ])
  })

  test('weeks across the turn of the year', () => {
    const weeks = loggedWeeks([day('2026-01-01'), day('2025-12-29')], '2026-01-07')

    expect(weeks.map((week) => week.monday)).toEqual(['2026-01-05', '2025-12-29'])
  })
})

describe('stepping between weeks', () => {
  const weeks = [
    { monday: '2026-10-19', average: null },
    { monday: '2026-10-05', average: 2000 },
    { monday: '2026-09-28', average: 2000 },
  ]

  test('skips weeks without any entry', () => {
    expect(olderWeek(weeks, '2026-10-19')).toBe('2026-10-05')
    expect(newerWeek(weeks, '2026-10-05')).toBe('2026-10-19')
  })

  test('stops at the oldest week and at the current one', () => {
    expect(olderWeek(weeks, '2026-09-28')).toBeNull()
    expect(newerWeek(weeks, '2026-10-19')).toBeNull()
  })
})

describe('weekNumber', () => {
  test('ISO weeks: Monday first, week 1 holds the first Thursday', () => {
    expect(weekNumber('2026-10-19')).toBe(43)
    expect(weekNumber('2026-01-01')).toBe(1)
    expect(weekNumber('2025-12-29')).toBe(1)
    expect(weekNumber('2027-01-01')).toBe(53)
  })
})

describe('rangeBounds for a chosen week', () => {
  test('a past week, compared with the week before it', () => {
    expect(rangeBounds('week', TODAY, '2026-10-08')).toEqual({
      first: '2026-10-05',
      last: '2026-10-11',
      previousFirst: '2026-09-28',
      previousLast: '2026-10-04',
    })
  })

  test('without a chosen week, the current one', () => {
    expect(rangeBounds('week', TODAY).first).toBe('2026-10-19')
  })
})
