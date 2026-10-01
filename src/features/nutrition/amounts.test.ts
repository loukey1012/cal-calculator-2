import { describe, expect, test } from 'vitest'
import { availableUnits, resolveAmount } from './amounts'
import { values } from './testData'
import type { IngredientNutrition } from './types'

const CREAM: IngredientNutrition = {
  per100g: values(92, { protein: 1.3 }),
  perUnit: null,
  unitWeightG: null,
}
const PROTEIN_BAR: IngredientNutrition = {
  per100g: null,
  perUnit: values(210, { protein: 20 }),
  unitWeightG: 60,
}
const BAR_WITHOUT_WEIGHT: IngredientNutrition = { ...PROTEIN_BAR, unitWeightG: null }
const EGG_BOTH: IngredientNutrition = {
  per100g: values(155, { protein: 13 }),
  perUnit: values(90, { protein: 7.5 }),
  unitWeightG: 58,
}
const EGG_PER_100G_WITH_WEIGHT: IngredientNutrition = { ...EGG_BOTH, perUnit: null }

describe('availableUnits', () => {
  test('per-100g only: grams', () => {
    expect(availableUnits(CREAM)).toEqual(['g'])
  })

  test('per-unit only without unit weight: units', () => {
    expect(availableUnits(BAR_WITHOUT_WEIGHT)).toEqual(['unit'])
  })

  test('a known unit weight unlocks the other unit', () => {
    expect(availableUnits(PROTEIN_BAR)).toEqual(['g', 'unit'])
    expect(availableUnits(EGG_PER_100G_WITH_WEIGHT)).toEqual(['g', 'unit'])
  })

  test('both bases: both units', () => {
    expect(availableUnits(EGG_BOTH)).toEqual(['g', 'unit'])
  })
})

describe('resolveAmount', () => {
  test('grams on a per-100g ingredient', () => {
    expect(resolveAmount(CREAM, 150, 'g')).toEqual({
      basis: 'per_100g',
      multiplier: 1.5,
      values: CREAM.per100g,
    })
  })

  test('units on a per-unit ingredient', () => {
    expect(resolveAmount(PROTEIN_BAR, 2, 'unit')).toEqual({
      basis: 'per_unit',
      multiplier: 2,
      values: PROTEIN_BAR.perUnit,
    })
  })

  test('prefers the basis matching the entered unit when both exist', () => {
    expect(resolveAmount(EGG_BOTH, 1, 'unit').basis).toBe('per_unit')
    expect(resolveAmount(EGG_BOTH, 100, 'g').basis).toBe('per_100g')
  })

  test('grams on a per-unit ingredient use the unit weight', () => {
    // 45 g of a 60 g bar = 0.75 bars
    expect(resolveAmount(PROTEIN_BAR, 45, 'g')).toMatchObject({
      basis: 'per_unit',
      multiplier: 0.75,
    })
  })

  test('units on a per-100g ingredient use the unit weight', () => {
    // 2 eggs × 58 g = 116 g = 1.16 × 100 g
    expect(resolveAmount(EGG_PER_100G_WITH_WEIGHT, 2, 'unit')).toMatchObject({
      basis: 'per_100g',
      multiplier: 1.16,
    })
  })

  test('rounds the multiplier to 4 decimals like the database column', () => {
    expect(resolveAmount(PROTEIN_BAR, 10, 'g').multiplier).toBe(0.1667)
  })

  test('rejects a unit the ingredient cannot be measured in', () => {
    expect(() => resolveAmount(CREAM, 1, 'unit')).toThrow("can't be measured in units")
    expect(() => resolveAmount(BAR_WITHOUT_WEIGHT, 30, 'g')).toThrow("can't be measured in grams")
  })

  test.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])('rejects amount %s', (amount) => {
    expect(() => resolveAmount(CREAM, amount, 'g')).toThrow(RangeError)
  })

  test('rejects an amount too small to store', () => {
    expect(() => resolveAmount(CREAM, 0.001, 'g')).toThrow('too small')
  })
})
