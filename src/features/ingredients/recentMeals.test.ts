import { describe, expect, test } from 'vitest'
import { gramsItem, sharedLine, testDish } from '../dishes/testData'
import { ingredientSource } from '../nutrition/fromIngredient'
import {
  mealsTouched,
  recentWindowStart,
  refreshedDish,
  refreshedItem,
  updatedMealsMessage,
} from './recentMeals'
import { ingredient } from './testData'

// Skyr edited: 70 kcal and 12 g protein per 100 g now, a cup weighs 150 g
const SKYR = ingredient({
  id: 'skyr',
  name: 'Skyr',
  brand: 'Milbona',
  kcal_100: 70,
  protein_100: 12,
  unit_label: 'cup',
  unit_weight_g: 150,
})
const source = ingredientSource(SKYR)
const loggedSkyr = { ...gramsItem('Skyr (old name)', 200, 62), ingredient_id: 'skyr' }

describe('recentWindowStart', () => {
  test('is the 13th day before today, so the window is 14 days with today', () => {
    expect(recentWindowStart('2026-10-15')).toBe('2026-10-02')
  })

  test('crosses month and year ends', () => {
    expect(recentWindowStart('2027-01-05')).toBe('2026-12-23')
  })
})

describe('refreshedItem', () => {
  test('takes the ingredient’s new values, name and brand for the same amount', () => {
    const item = refreshedItem(loggedSkyr, source)

    expect(item).toMatchObject({
      ingredient_id: 'skyr',
      name: 'Skyr',
      brand: 'Milbona',
      entered_amount: 200,
      entered_unit: 'g',
      basis: 'per_100g',
      basis_multiplier: 2,
      kcal: 70,
      protein: 12,
    })
  })

  test('an amount in units follows a changed unit weight', () => {
    const inCups = { ...loggedSkyr, entered_amount: 1, entered_unit: 'unit' as const }

    expect(refreshedItem(inCups, source)).toMatchObject({
      basis: 'per_100g',
      basis_multiplier: 1.5,
    })
  })

  test('is null when the amount can’t be measured any more, e.g. units without a unit weight', () => {
    const inCups = { ...loggedSkyr, entered_amount: 1, entered_unit: 'unit' as const }
    const noUnits = ingredientSource({ ...SKYR, unit_weight_g: null })

    expect(refreshedItem(inCups, noUnits)).toBeNull()
  })
})

describe('refreshedDish', () => {
  test('updates only the lines with that ingredient and leaves the rest as they are', () => {
    const mince = sharedLine('l-mince', 'Mince', 400, 250)
    const dish = testDish({
      lines: [mince, { id: 'l-skyr', allocation: 'shared', item: loggedSkyr, amounts: {} }],
    })

    const refreshed = refreshedDish(dish, 'skyr', source)

    expect(refreshed?.lines[0]).toBe(mince)
    expect(refreshed?.lines[1]?.item).toMatchObject({ name: 'Skyr', kcal: 70, protein: 12 })
    expect(refreshed?.lines[1]?.id).toBe('l-skyr')
  })

  test('is null when no line uses that ingredient', () => {
    expect(refreshedDish(testDish(), 'skyr', source)).toBeNull()
  })
})

describe('mealsTouched', () => {
  test('counts each meal once, whoever’s it is', () => {
    const meals = [
      { userId: 'me', date: '2026-10-14', mealType: 'lunch' as const },
      { userId: 'me', date: '2026-10-14', mealType: 'lunch' as const },
      { userId: 'her', date: '2026-10-14', mealType: 'lunch' as const },
      { userId: 'me', date: '2026-10-13', mealType: 'lunch' as const },
    ]

    expect(mealsTouched(meals)).toHaveLength(3)
  })
})

describe('updatedMealsMessage', () => {
  test('names how many meals got the new values', () => {
    expect(updatedMealsMessage(1)).toBe('Updated in 1 meal')
    expect(updatedMealsMessage(5)).toBe('Updated in 5 meals')
  })

  test('says nothing when no meal had it', () => {
    expect(updatedMealsMessage(0)).toBeNull()
  })
})
