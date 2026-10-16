import { describe, expect, test } from 'vitest'
import type { GoalProgress, RingKey } from '../nutrition/goals'
import { DEFAULT_OVER_COLORS, overColorPair, overLevel, parseOverColors } from './overColors'

const goal = (key: RingKey, ratio: number): GoalProgress => ({
  key,
  consumed: ratio * 100,
  target: 100,
  ratio,
  remaining: 100 - ratio * 100,
  reached: ratio >= 1,
  incomplete: false,
  estimated: false,
})

describe('overLevel', () => {
  test.each([
    [0.99, 'none'],
    [1, 'full'],
    [1.1, 'full'],
    [1.11, 'well'],
    [2, 'well'],
  ] as const)('calories at %s of the goal: %s', (ratio, level) => {
    expect(overLevel(goal('kcal', ratio))).toBe(level)
  })

  test('carbs and fat change too; protein and fiber never do', () => {
    expect(overLevel(goal('carbs', 1.05))).toBe('full')
    expect(overLevel(goal('fat', 1.3))).toBe('well')
    expect(overLevel(goal('protein', 1.5))).toBe('none')
    expect(overLevel(goal('fiber', 1.5))).toBe('none')
  })
})

describe('parseOverColors', () => {
  test('starts with the Signal colors', () => {
    expect(parseOverColors(undefined)).toEqual(DEFAULT_OVER_COLORS)
    expect(DEFAULT_OVER_COLORS.mode).toBe('signal')
  })

  test('keeps valid choices and replaces only what is invalid', () => {
    expect(parseOverColors({ mode: 'custom', full: '#ABCDEF', well: 'red' })).toEqual({
      mode: 'custom',
      full: '#abcdef',
      well: DEFAULT_OVER_COLORS.well,
    })
    expect(parseOverColors({ mode: 'rainbow' }).mode).toBe('signal')
  })
})

describe('overColorPair', () => {
  test('a preset’s two colors, your own two, or none when off', () => {
    expect(overColorPair({ ...DEFAULT_OVER_COLORS, mode: 'signal' })).toEqual({
      full: '#f5a524',
      well: '#e5484d',
    })
    expect(overColorPair({ mode: 'custom', full: '#111111', well: '#222222' })).toEqual({
      full: '#111111',
      well: '#222222',
    })
    expect(overColorPair({ ...DEFAULT_OVER_COLORS, mode: 'off' })).toBeNull()
  })
})
