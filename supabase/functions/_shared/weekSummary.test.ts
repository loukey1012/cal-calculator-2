import { describe, expect, test } from 'vitest'
import { weekFigures, goalOn, savedKcal, withinGoal, type WeekDayRow } from './weekSummary'

const TODAY = '2026-10-26'
const day = (date: string, kcal: number, extra: Partial<WeekDayRow> = {}): WeekDayRow => ({
  date,
  kcal,
  mealCount: 3,
  lunchLogged: true,
  dinnerLogged: true,
  ...extra,
})
const GOALS = [{ validFrom: '2026-01-01', kcal: 2000 }]

describe('goalOn', () => {
  test('is the latest goal valid on the date', () => {
    const goals = [
      { validFrom: '2026-01-01', kcal: 2000 },
      { validFrom: '2026-10-21', kcal: 1800 },
    ]
    expect(goalOn(goals, '2026-10-20')?.kcal).toBe(2000)
    expect(goalOn(goals, '2026-10-21')?.kcal).toBe(1800)
    expect(goalOn(goals, '2025-12-31')).toBeNull()
  })
})

describe('savedKcal', () => {
  test('burned times counted days minus calories rounded up per day', () => {
    const days = [day('2026-10-19', 1500.2), day('2026-10-20', 1700)]
    expect(savedKcal(days, 2500, TODAY)).toEqual({
      saved: 1799,
      burned: 5000,
      eaten: 3201,
      days: 2,
    })
  })

  test('is null without a burned figure or counted days', () => {
    expect(savedKcal([day('2026-10-19', 1500)], null, TODAY)).toBeNull()
    expect(savedKcal([], 2500, TODAY)).toBeNull()
  })
})

describe('withinGoal', () => {
  test("counts days up to 110 % of that day's goal", () => {
    const days = [day('2026-10-19', 2200), day('2026-10-20', 2201)]
    expect(withinGoal(days, GOALS)).toEqual({ within: 1, of: 2 })
  })

  test('is null when no day has a goal', () => {
    expect(withinGoal([day('2026-10-19', 2000)], [])).toBeNull()
  })
})

describe('weekFigures', () => {
  test('leaves out cheat, alcohol, cheat meal, missing meal and empty days', () => {
    const days = [
      day('2026-10-19', 2000),
      day('2026-10-20', 1000, { cheatDay: true }),
      day('2026-10-21', 5000, { alcoholDay: true }),
      day('2026-10-22', 4000, { cheatMeal: true }),
      day('2026-10-23', 300, { dinnerLogged: false }),
      day('2026-10-24', 0, { mealCount: 0 }),
      day('2026-10-25', 1000),
    ]
    expect(weekFigures(days, GOALS, 2500, TODAY)).toEqual({
      counted: 2,
      averageKcal: 1500,
      within: { within: 2, of: 2 },
      saved: 2000,
    })
  })

  test('saved is negative for a surplus and null without calories burned', () => {
    const days = [day('2026-10-19', 3000)]
    expect(weekFigures(days, GOALS, 2500, TODAY)?.saved).toBe(-500)
    expect(weekFigures(days, GOALS, null, TODAY)?.saved).toBeNull()
  })

  test('is null when no day counts', () => {
    expect(
      weekFigures([day('2026-10-19', 1000, { cheatDay: true })], GOALS, 2500, TODAY),
    ).toBeNull()
    expect(weekFigures([], GOALS, 2500, TODAY)).toBeNull()
  })

  test('the average is rounded up like the app', () => {
    const days = [day('2026-10-19', 1000), day('2026-10-20', 1001)]
    expect(weekFigures(days, GOALS, null, TODAY)?.averageKcal).toBe(1001)
  })
})
