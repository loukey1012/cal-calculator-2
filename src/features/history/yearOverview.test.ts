import { describe, expect, test } from 'vitest'
import { miniMonthOf, monthsOfYear, yearRange } from './yearOverview'

describe('monthsOfYear', () => {
  test('lists the first day of each of the twelve months', () => {
    const months = monthsOfYear(2026)

    expect(months).toHaveLength(12)
    expect(months[0]).toBe('2026-01-01')
    expect(months[8]).toBe('2026-09-01')
    expect(months[11]).toBe('2026-12-01')
  })
})

describe('yearRange', () => {
  test('runs from the first of January to the 31st of December', () => {
    expect(yearRange(2026)).toEqual({ first: '2026-01-01', last: '2026-12-31' })
  })

  test('pads short years to four digits', () => {
    expect(yearRange(999)).toEqual({ first: '0999-01-01', last: '0999-12-31' })
    expect(monthsOfYear(999)[0]).toBe('0999-01-01')
  })
})

describe('miniMonthOf', () => {
  test('leaves as many blanks as the weekdays before the 1st, Monday first', () => {
    // 1 October 2026 is a Thursday
    const october = miniMonthOf('2026-10-01')

    expect(october.leadingBlanks).toBe(3)
    expect(october.days).toHaveLength(31)
    expect(october.days[0]).toBe('2026-10-01')
    expect(october.days.at(-1)).toBe('2026-10-31')
  })

  test('a month starting on a Monday has no blanks', () => {
    // 1 June 2026 is a Monday
    expect(miniMonthOf('2026-06-01').leadingBlanks).toBe(0)
  })

  test('a month starting on a Sunday has six blanks', () => {
    // 1 November 2026 is a Sunday
    expect(miniMonthOf('2026-11-01').leadingBlanks).toBe(6)
  })

  test('knows leap years', () => {
    expect(miniMonthOf('2024-02-01').days).toHaveLength(29)
    expect(miniMonthOf('2026-02-01').days).toHaveLength(28)
  })
})
