import { describe, expect, test } from 'vitest'
import { addMonths, dayStatus, monthGrid, monthRange, monthStart, monthSummary } from './calendar'

const GOAL = {
  validFrom: '2026-09-01',
  kcal: 2000,
  proteinG: 120,
  carbsG: null,
  fatG: null,
  fiberG: null,
}

describe('months', () => {
  test('start, range and stepping across years', () => {
    expect(monthStart('2026-10-17')).toBe('2026-10-01')
    expect(monthRange('2026-02-01')).toEqual({ first: '2026-02-01', last: '2026-02-28' })
    expect(addMonths('2026-12-01', 1)).toBe('2027-01-01')
    expect(addMonths('2026-01-01', -1)).toBe('2025-12-01')
  })

  test('the grid has Monday-first weeks with blanks before and after the month', () => {
    // 1 October 2026 is a Thursday
    const grid = monthGrid('2026-10-01')

    expect(grid[0]).toEqual([
      null,
      null,
      null,
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ])
    expect(grid.at(-1)).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      null,
    ])
    expect(grid.flat().filter(Boolean)).toHaveLength(31)
  })
})

describe('dayStatus', () => {
  test('within the calorie goal, over it, logged without a goal, or nothing logged', () => {
    expect(
      dayStatus(
        { date: '2026-10-01', kcal: 1999.2, protein: 0, mealCount: 2, kcalEstimated: false },
        [GOAL],
      ),
    ).toBe('onTarget')
    expect(
      dayStatus(
        { date: '2026-10-01', kcal: 2000.4, protein: 0, mealCount: 2, kcalEstimated: false },
        [GOAL],
      ),
    ).toBe('over')
    expect(
      dayStatus({ date: '2026-08-01', kcal: 500, protein: 0, mealCount: 1, kcalEstimated: false }, [
        GOAL,
      ]),
    ).toBe('logged')
    expect(
      dayStatus({ date: '2026-10-01', kcal: 0, protein: 0, mealCount: 0, kcalEstimated: false }, [
        GOAL,
      ]),
    ).toBe('none')
    expect(dayStatus(undefined, [GOAL])).toBe('none')
  })
})

describe('monthSummary', () => {
  test('averages over the days that have something logged', () => {
    expect(
      monthSummary([
        { date: '2026-10-01', kcal: 2000, protein: 100, mealCount: 3, kcalEstimated: false },
        { date: '2026-10-02', kcal: 1000, protein: 50, mealCount: 1, kcalEstimated: false },
        { date: '2026-10-03', kcal: 0, protein: 0, mealCount: 0, kcalEstimated: false },
      ]),
    ).toEqual({ loggedDays: 2, averageKcal: 1500, averageProtein: 75, estimated: false })
    expect(monthSummary([])).toEqual({
      loggedDays: 0,
      averageKcal: 0,
      averageProtein: 0,
      estimated: false,
    })
  })

  test('one logged day with estimated calories makes the average an estimate', () => {
    const summary = monthSummary([
      { date: '2026-10-01', kcal: 2000, protein: 100, mealCount: 3, kcalEstimated: true },
      { date: '2026-10-02', kcal: 1000, protein: 50, mealCount: 1, kcalEstimated: false },
    ])

    expect(summary).toMatchObject({ averageKcal: 1500, estimated: true })
  })
})
