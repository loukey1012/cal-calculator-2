import { describe, expect, test } from 'vitest'
import {
  addDays,
  isoWeekOf,
  isoWeekday,
  previousIsoWeek,
  weekDatesOf,
  weekPath,
  weeksInYear,
} from './isoWeek'

describe('isoWeekOf', () => {
  test('numbers an ordinary week', () => {
    expect(isoWeekOf('2026-10-19')).toEqual({ year: 2026, week: 43 })
    expect(isoWeekOf('2026-10-25')).toEqual({ year: 2026, week: 43 })
  })

  test('the first days of January can belong to the last week of the year before', () => {
    expect(isoWeekOf('2027-01-01')).toEqual({ year: 2026, week: 53 })
    expect(isoWeekOf('2027-01-04')).toEqual({ year: 2027, week: 1 })
  })

  test('the last days of December can belong to week 1 of the next year', () => {
    expect(isoWeekOf('2024-12-30')).toEqual({ year: 2025, week: 1 })
  })
})

describe('weeksInYear', () => {
  test('52 or 53', () => {
    expect(weeksInYear(2026)).toBe(53)
    expect(weeksInYear(2025)).toBe(52)
  })
})

describe('weekDatesOf', () => {
  test('the seven dates, Monday first', () => {
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

  test('week 53 runs into the new year', () => {
    expect(weekDatesOf({ year: 2026, week: 53 }).at(-1)).toBe('2027-01-03')
  })
})

describe('previousIsoWeek', () => {
  test('is the week before the one holding the date', () => {
    expect(previousIsoWeek('2026-10-26')).toEqual({ year: 2026, week: 43 })
    expect(previousIsoWeek('2026-10-28')).toEqual({ year: 2026, week: 43 })
  })

  test('crosses the year boundary', () => {
    expect(previousIsoWeek('2027-01-04')).toEqual({ year: 2026, week: 53 })
    expect(previousIsoWeek('2026-01-05')).toEqual({ year: 2026, week: 1 })
    expect(previousIsoWeek('2026-01-01')).toEqual({ year: 2025, week: 52 })
  })
})

describe('isoWeekday', () => {
  test('1 for Monday to 7 for Sunday', () => {
    expect(isoWeekday('2026-10-26')).toBe(1)
    expect(isoWeekday('2026-10-31')).toBe(6)
    expect(isoWeekday('2026-11-01')).toBe(7)
  })
})

describe('weekPath and addDays', () => {
  test('the address of the week page', () => {
    expect(weekPath({ year: 2026, week: 3 })).toBe('/history/week-2026-03')
  })

  test('adds days across months', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})
