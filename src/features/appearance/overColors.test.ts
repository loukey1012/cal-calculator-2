import { describe, expect, test } from 'vitest'
import type { GoalProgress, RingKey } from '../nutrition/goals'
import {
  DEFAULT_OVER_COLORS,
  calorieOverLevel,
  overColorPair,
  overLevel,
  parseOverColors,
} from './overColors'

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

describe('calorieOverLevel', () => {
  test.each([
    [2000, 2000, 'none'],
    [2000, 2200, 'none'],
    [2000, 2201, 'full'],
    [2000, 2300, 'full'],
    [2000, 2301, 'well'],
    [3500, 3800, 'none'],
    [3500, 3801, 'well'],
    [1000, 1101, 'full'],
    [1000, 1400, 'well'],
  ] as const)('goal %s, eaten %s: %s', (target, consumed, level) => {
    expect(calorieOverLevel(consumed, target)).toBe(level)
  })
})

describe('overLevel', () => {
  test('calories follow the calorie rule: 10 % over is still within the goal', () => {
    expect(overLevel(goal('kcal', 0.99))).toBe('none')
    expect(overLevel(goal('kcal', 1))).toBe('none')
    expect(overLevel(goal('kcal', 1.1))).toBe('none')
    expect(overLevel(goal('kcal', 1.11))).toBe('full')
    // a small goal: more than 300 kcal over is red
    expect(overLevel(goal('kcal', 4.01))).toBe('well')
  })

  test('only calories change; carbs, fat, protein and fiber never do', () => {
    expect(overLevel(goal('carbs', 1.3))).toBe('none')
    expect(overLevel(goal('fat', 1.3))).toBe('none')
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
