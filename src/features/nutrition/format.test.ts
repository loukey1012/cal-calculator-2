import { describe, expect, test } from 'vitest'
import { formatGrams, formatKcal, toWholeKcal } from './format'

describe('toWholeKcal', () => {
  test('rounds up to whole calories', () => {
    expect(toWholeKcal(32.2)).toBe(33)
    expect(toWholeKcal(92)).toBe(92)
    expect(toWholeKcal(0)).toBe(0)
  })

  test('ignores floating point noise instead of rounding it up', () => {
    // 3 × 0.1 × 100 = 30.000000000000004 in floating point
    expect(toWholeKcal(3 * 0.1 * 100)).toBe(30)
  })
})

describe('formatKcal', () => {
  test('shows rounded-up whole calories with grouping in the given locale', () => {
    expect(formatKcal(1999.1, 'en')).toBe('2,000')
    expect(formatKcal(1999.1, 'de')).toBe('2.000')
  })
})

describe('formatGrams', () => {
  test('shows one decimal in the given locale', () => {
    expect(formatGrams(1.95, 'en')).toBe('2.0')
    expect(formatGrams(12.34, 'de')).toBe('12,3')
    expect(formatGrams(7, 'en')).toBe('7.0')
  })

  test('never shows negative zero', () => {
    expect(formatGrams(-0.01, 'en')).toBe('0.0')
  })
})
