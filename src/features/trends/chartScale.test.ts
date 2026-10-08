import { describe, expect, test } from 'vitest'
import { dayIndex, niceScale } from './chartScale'

describe('niceScale', () => {
  test('clean ticks from zero for amounts', () => {
    expect(niceScale(0, 2240)).toEqual({
      min: 0,
      max: 2500,
      ticks: [0, 500, 1000, 1500, 2000, 2500],
    })
    expect(niceScale(0, 47)).toEqual({ min: 0, max: 50, ticks: [0, 10, 20, 30, 40, 50] })
  })

  test('a narrow band for weights', () => {
    expect(niceScale(67.6, 74.2)).toEqual({ min: 66, max: 76, ticks: [66, 68, 70, 72, 74, 76] })
  })

  test('a flat line still gets some room', () => {
    expect(niceScale(72, 72).max).toBeGreaterThan(72)
    expect(niceScale(0, 0)).toMatchObject({ min: 0 })
  })
})

describe('dayIndex', () => {
  test('days since the first day, also across a clock change', () => {
    expect(dayIndex('2026-10-01', '2026-10-01')).toBe(0)
    expect(dayIndex('2026-10-01', '2026-10-27')).toBe(26)
  })
})
