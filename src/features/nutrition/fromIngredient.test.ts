import { describe, expect, test } from 'vitest'
import type { Tables } from '../../lib/database.types'
import { buildMealItem, ingredientNutrition } from './fromIngredient'
import { values } from './testData'

const ROW: Tables<'ingredients'> = {
  id: 'i1',
  household_id: 'h1',
  category_id: null,
  name: 'Protein bar',
  brand: 'Brand X',
  note: null,
  kcal_100: null,
  protein_100: null,
  carbs_100: null,
  sugar_100: null,
  fat_100: null,
  sat_fat_100: null,
  fiber_100: null,
  salt_100: null,
  unit_label: 'bar',
  unit_weight_g: 60,
  kcal_unit: 210,
  protein_unit: 20,
  carbs_unit: 15,
  sugar_unit: null,
  fat_unit: 8,
  sat_fat_unit: null,
  fiber_unit: null,
  salt_unit: 0.2,
  legacy_id: null,
  barcode: null,
  kcal_estimated: false,
  created_by: null,
  created_at: '',
  updated_at: '',
}

describe('ingredientNutrition', () => {
  test('maps per-unit columns and leaves the missing per-100g basis empty', () => {
    expect(ingredientNutrition(ROW)).toEqual({
      per100g: null,
      perUnit: values(210, { protein: 20, carbs: 15, fat: 8, salt: 0.2 }),
      unitWeightG: 60,
    })
  })

  test('maps per-100g columns', () => {
    const row = { ...ROW, kcal_100: 350, protein_100: 33.3, kcal_unit: null, protein_unit: null }
    const nutrition = ingredientNutrition({
      ...row,
      carbs_unit: null,
      fat_unit: null,
      salt_unit: null,
    })

    expect(nutrition.per100g).toEqual(values(350, { protein: 33.3 }))
    expect(nutrition.perUnit).toBeNull()
  })
})

describe('buildMealItem', () => {
  test('creates a meal item row with a nutrition snapshot of the chosen basis', () => {
    const item = buildMealItem(
      {
        ingredientId: 'i1',
        name: 'Protein bar',
        brand: 'Brand X',
        nutrition: ingredientNutrition(ROW),
      },
      45,
      'g',
    )

    expect(item).toEqual({
      ingredient_id: 'i1',
      name: 'Protein bar',
      brand: 'Brand X',
      entered_amount: 45,
      entered_unit: 'g',
      basis: 'per_unit',
      basis_multiplier: 0.75,
      kcal: 210,
      protein: 20,
      carbs: 15,
      sugar: null,
      fat: 8,
      sat_fat: null,
      fiber: null,
      salt: 0.2,
    })
  })

  test('custom one-off items have no ingredient and whole-number calories (rounded up)', () => {
    const item = buildMealItem(
      {
        ingredientId: null,
        name: 'Bakery croissant',
        brand: null,
        nutrition: { per100g: null, perUnit: values(231.2), unitWeightG: null },
      },
      1,
      'unit',
    )

    expect(item).toMatchObject({ ingredient_id: null, kcal: 232, basis_multiplier: 1 })
  })

  test('rounds the entered amount to 2 decimals like the database column', () => {
    const item = buildMealItem(
      { ingredientId: 'i1', name: 'x', brand: null, nutrition: ingredientNutrition(ROW) },
      12.3456,
      'unit',
    )

    expect(item.entered_amount).toBe(12.35)
  })
})
