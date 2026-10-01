import { describe, expect, test } from 'vitest'
import { formatGrams, formatKcal, macroSummary, toWholeKcal } from './format'
import { EMPTY_TOTALS } from './totals'

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

describe('macroSummary', () => {
  test('shows protein, carbs and fat with one decimal', () => {
    expect(macroSummary({ ...EMPTY_TOTALS, protein: 31.95, carbs: 40, fat: 27 }, 'en')).toBe(
      'P 32.0 g · C 40.0 g · F 27.0 g',
    )
  })

  test('shows a dash for nutrients no logged item had a value for, instead of a false 0', () => {
    const totals = { ...EMPTY_TOTALS, protein: 1.3, missing: ['carbs', 'fat'] as const }

    expect(macroSummary(totals, 'en')).toBe('P 1.3 g · C – · F –')
  })
})
