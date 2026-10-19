import { describe, expect, test } from 'vitest'
import { EMPTY_INGREDIENT_FORM, EMPTY_BASIS } from '../ingredients/ingredientForm'
import { withLabelValues } from './labelForm'
import type { LabelReading } from './labelParser'

const READING: LabelReading = {
  measure: 'ml',
  values: {
    kcal: 43,
    fat: 0,
    sat_fat: null,
    carbs: 10.6,
    sugar: 10.6,
    fiber: null,
    protein: 0,
    salt: 0.01,
  },
  found: 6,
}

describe('withLabelValues', () => {
  test('replaces only the values per 100 and the measure; unknown ones stay empty', () => {
    const before = {
      ...EMPTY_INGREDIENT_FORM,
      name: 'Cola',
      per100gEnabled: true,
      per100g: { ...EMPTY_BASIS, kcal: '50', fiber: '1' },
      perUnitEnabled: true,
      perUnit: { ...EMPTY_BASIS, kcal: '140' },
      unitLabel: 'can',
      unitWeightG: '330',
    }

    const after = withLabelValues(before, READING)

    expect(after.per100gEnabled).toBe(true)
    expect(after.per100g).toEqual({
      kcal: '43',
      fat: '0',
      sat_fat: '',
      carbs: '10.6',
      sugar: '10.6',
      fiber: '',
      protein: '0',
      salt: '0.01',
    })
    expect(after.measure).toBe('ml')
    // the rest as it was
    expect(after).toMatchObject({
      name: 'Cola',
      perUnitEnabled: true,
      perUnit: { kcal: '140' },
      unitLabel: 'can',
      unitWeightG: '330',
    })
  })
})
