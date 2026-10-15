import { describe, expect, test } from 'vitest'
import { mealItem } from '../meals/testData'
import { kcalProgress } from './todayProgress'

const GOAL = {
  validFrom: '2026-10-01',
  kcal: 2000,
  proteinG: null,
  carbsG: null,
  fatG: null,
  fiberG: null,
  weightGoalKg: null,
}

const item = (kcal: number) => mealItem({ kcal, basis_multiplier: 1 })

describe('kcalProgress', () => {
  test('is today’s calories as a share of the goal, over 1 above it', () => {
    expect(kcalProgress([item(500), item(500)], GOAL)).toBe(0.5)
    expect(kcalProgress([item(2400)], GOAL)).toBe(1.2)
  })

  test('is null without a goal', () => {
    expect(kcalProgress([item(500)], null)).toBeNull()
  })
})
