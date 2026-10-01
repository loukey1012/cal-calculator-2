import { describe, expect, test } from 'vitest'
import { values } from '../nutrition/testData'
import { previewChangedItem, previewNewItem } from './preview'
import { mealItem } from './testData'

const CREAM = { per100g: values(92, { protein: 1.3 }), perUnit: null, unitWeightG: null }

describe('previewNewItem', () => {
  test('totals for the amount', () => {
    expect(previewNewItem(CREAM, 200, 'g')).toMatchObject({ kcal: 184 })
  })

  test('null when the amount cannot be logged in that unit', () => {
    expect(previewNewItem(CREAM, 2, 'unit')).toBeNull()
    expect(previewNewItem(CREAM, 0.001, 'g')).toBeNull()
  })
})

describe('previewChangedItem', () => {
  const item = mealItem({ entered_amount: 150, basis_multiplier: 1.5, kcal: 92 })

  test('totals for the new amount', () => {
    expect(previewChangedItem(item, 300)).toMatchObject({ kcal: 276 })
  })

  test('null when the new amount is not storable', () => {
    expect(previewChangedItem(item, 0)).toBeNull()
  })
})
