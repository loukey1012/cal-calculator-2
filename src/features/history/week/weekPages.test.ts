import { describe, expect, test } from 'vitest'
import { isoWeekOf, shiftWeek, weekDatesOf, weekPageOf, weekPath, weeksInYear } from './weekPages'

describe('isoWeekOf', () => {
  test.each([
    ['2026-10-19', { year: 2026, week: 43 }],
    ['2026-10-25', { year: 2026, week: 43 }],
    ['2026-10-26', { year: 2026, week: 44 }],
    ['2026-01-01', { year: 2026, week: 1 }],
    ['2026-12-31', { year: 2026, week: 53 }],
    ['2027-01-01', { year: 2026, week: 53 }],
    ['2027-01-03', { year: 2026, week: 53 }],
    ['2027-01-04', { year: 2027, week: 1 }],
    ['2024-12-30', { year: 2025, week: 1 }],
    ['2021-01-03', { year: 2020, week: 53 }],
    ['2020-12-31', { year: 2020, week: 53 }],
    ['2025-12-29', { year: 2026, week: 1 }],
  ])('%s is in %j', (date, expected) => {
    expect(isoWeekOf(date)).toEqual(expected)
  })
})

describe('weekDatesOf', () => {
  test('lists Monday to Sunday', () => {
    expect(weekDatesOf({ year: 2026, week: 43 })).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ])
  })

  test('week 1 can start in the year before', () => {
    expect(weekDatesOf({ year: 2025, week: 1 })[0]).toBe('2024-12-30')
  })

  test('week 53 ends in the next year', () => {
    expect(weekDatesOf({ year: 2026, week: 53 }).at(-1)).toBe('2027-01-03')
  })

  test('every date of a week maps back to the week', () => {
    for (const week of [
      { year: 2026, week: 53 },
      { year: 2027, week: 1 },
      { year: 2020, week: 53 },
    ]) {
      for (const date of weekDatesOf(week)) expect(isoWeekOf(date)).toEqual(week)
    }
  })
})

describe('weeksInYear', () => {
  test('knows the years with 53 weeks', () => {
    expect(weeksInYear(2026)).toBe(53)
    expect(weeksInYear(2020)).toBe(53)
    expect(weeksInYear(2025)).toBe(52)
    expect(weeksInYear(2027)).toBe(52)
  })
})

describe('shiftWeek', () => {
  test('crosses the year boundary both ways', () => {
    expect(shiftWeek({ year: 2026, week: 53 }, 1)).toEqual({ year: 2027, week: 1 })
    expect(shiftWeek({ year: 2027, week: 1 }, -1)).toEqual({ year: 2026, week: 53 })
    expect(shiftWeek({ year: 2025, week: 52 }, 1)).toEqual({ year: 2026, week: 1 })
  })
})

const TODAY = '2026-10-28'

describe('weekPath and weekPageOf', () => {
  test('round trip', () => {
    expect(weekPath({ year: 2026, week: 44 })).toBe('/history/week-2026-44')
    expect(weekPageOf('/history/week-2026-44', TODAY)).toEqual({ year: 2026, week: 44 })
    expect(weekPageOf('/history/week-2026-53/', TODAY)).toEqual({ year: 2026, week: 53 })
  })

  test.each([
    '/history',
    '/history/2026-10-20',
    '/history/week-2026-54',
    '/history/week-2025-53',
    '/history/week-2026-00',
    '/history/week-2026-4',
    '/today/week-2026-44',
    '/history/week-2026-44/extra',
    '/history/2026-10-20/week-2026-44',
  ])('%s is no week page', (path) => {
    expect(weekPageOf(path, TODAY)).toBeNull()
  })

  test('a week of next year is still a page, the years before 2000 and after it are not', () => {
    expect(weekPageOf('/history/week-2027-10', TODAY)).toEqual({ year: 2027, week: 10 })
    expect(weekPageOf('/history/week-2000-10', TODAY)).toEqual({ year: 2000, week: 10 })
    expect(weekPageOf('/history/week-1999-52', TODAY)).toBeNull()
    expect(weekPageOf('/history/week-0001-01', TODAY)).toBeNull()
    expect(weekPageOf('/history/week-2028-10', TODAY)).toBeNull()
    expect(weekPageOf('/history/week-9999-10', TODAY)).toBeNull()
  })
})
