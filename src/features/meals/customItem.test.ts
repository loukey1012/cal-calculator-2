import { describe, expect, test } from 'vitest'
import { EMPTY_CUSTOM_ITEM, parseCustomItem, type CustomItemValues } from './customItem'

function values(overrides: Partial<CustomItemValues>): CustomItemValues {
  return { ...EMPTY_CUSTOM_ITEM, name: 'Bakery croissant', kcal: '231', amount: '1', ...overrides }
}

describe('parseCustomItem', () => {
  test('per unit: a one-off item that is not linked to the ingredient database', () => {
    const result = parseCustomItem(values({ basis: 'per_unit', protein: '5,5' }))

    expect(result).toEqual({
      success: true,
      data: {
        source: {
          ingredientId: null,
          name: 'Bakery croissant',
          brand: null,
          nutrition: {
            per100g: null,
            perUnit: {
              kcal: 231,
              protein: 5.5,
              carbs: null,
              sugar: null,
              fat: null,
              sat_fat: null,
              fiber: null,
              salt: null,
            },
            unitWeightG: null,
          },
        },
        amount: 1,
        unit: 'unit',
      },
    })
  })

  test('per 100 g is logged in grams', () => {
    const result = parseCustomItem(values({ basis: 'per_100g', amount: '80' }))

    expect(result.success && result.data.unit).toBe('g')
    expect(result.success && result.data.source.nutrition.per100g?.kcal).toBe(231)
  })

  test('reports missing or invalid fields', () => {
    const result = parseCustomItem(values({ name: '', kcal: '', amount: '0', fat: 'x' }))

    expect(result).toEqual({
      success: false,
      errors: {
        name: 'Enter a name',
        kcal: 'Enter the calories',
        fat: 'Enter a number',
        amount: 'Enter an amount',
      },
    })
  })
})
