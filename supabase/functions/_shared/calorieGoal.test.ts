import { describe, expect, test } from 'vitest'
import { calorieOverLevel, toWholeKcal } from './calorieGoal'

describe('toWholeKcal', () => {
  test('rounds up, ignoring float noise', () => {
    expect(toWholeKcal(1999.2)).toBe(2000)
    expect(toWholeKcal(0.1 * 3 * 100)).toBe(30)
  })
})

describe('calorieOverLevel', () => {
  test('none up to 10 % over, full beyond, well more than 300 kcal over', () => {
    expect(calorieOverLevel(2200, 2000)).toBe('none')
    expect(calorieOverLevel(2201, 2000)).toBe('full')
    expect(calorieOverLevel(2300, 2000)).toBe('full')
    expect(calorieOverLevel(2301, 2000)).toBe('well')
  })
})
