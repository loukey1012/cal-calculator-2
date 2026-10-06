import { describe, expect, test } from 'vitest'
import { previewChangedItem } from './preview'
import { mealItem } from './testData'

describe('previewChangedItem', () => {
  const item = mealItem({ entered_amount: 150, basis_multiplier: 1.5, kcal: 92 })

  test('totals for the new amount', () => {
    expect(previewChangedItem(item, 300)).toMatchObject({ kcal: 276 })
  })

  test('null when the new amount is not storable', () => {
    expect(previewChangedItem(item, 0)).toBeNull()
  })
})
