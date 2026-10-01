import { describe, expect, test } from 'vitest'
import { fromLocalDateString, msUntilNextMidnight, toLocalDateString } from './dates'

describe('toLocalDateString', () => {
  test('uses the local calendar day, not UTC', () => {
    // 23:59 local stays on the same day whatever the timezone
    expect(toLocalDateString(new Date(2026, 9, 1, 23, 59))).toBe('2026-10-01')
    expect(toLocalDateString(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05')
  })
})

describe('fromLocalDateString', () => {
  test('parses a YYYY-MM-DD day as local midnight', () => {
    const date = fromLocalDateString('2026-10-01')

    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      2026, 9, 1, 0,
    ])
  })
})

describe('msUntilNextMidnight', () => {
  test('counts down to the start of the next local day', () => {
    expect(msUntilNextMidnight(new Date(2026, 9, 1, 23, 59, 30))).toBe(30_000)
    expect(msUntilNextMidnight(new Date(2026, 9, 1, 0, 0, 0))).toBe(24 * 60 * 60 * 1000)
  })
})
