import { describe, expect, test } from 'vitest'
import {
  calculateMissingValues,
  EMPTY_INGREDIENT_FORM,
  NEW_CATEGORY,
  parseIngredientForm,
  toFormValues,
  type IngredientFormValues,
} from './ingredientForm'
import { ingredient } from './testData'

function form(overrides: Partial<IngredientFormValues>): IngredientFormValues {
  return { ...EMPTY_INGREDIENT_FORM, name: 'Cream', ...overrides }
}

const per100g = (values: Partial<IngredientFormValues['per100g']>) => ({
  ...EMPTY_INGREDIENT_FORM.per100g,
  ...values,
})
const perUnit = (values: Partial<IngredientFormValues['perUnit']>) => ({
  ...EMPTY_INGREDIENT_FORM.perUnit,
  ...values,
})

function parsed(values: IngredientFormValues) {
  const result = parseIngredientForm(values)
  if (!result.success) throw new Error(`expected success: ${JSON.stringify(result.errors)}`)
  return result.data
}

function errorsOf(values: IngredientFormValues) {
  const result = parseIngredientForm(values)
  if (result.success) throw new Error('expected validation errors')
  return result.errors
}

describe('parseIngredientForm', () => {
  test('per 100 g with only calories is enough; empty optional values are unknown (null)', () => {
    const data = parsed(
      form({ brand: ' Milbona ', per100gEnabled: true, per100g: per100g({ kcal: '92' }) }),
    )

    expect(data.ingredient).toMatchObject({
      name: 'Cream',
      brand: 'Milbona',
      note: null,
      kcal_100: 92,
      protein_100: null,
      kcal_unit: null,
      unit_label: null,
      unit_weight_g: null,
    })
    expect(data.category).toEqual({ kind: 'none' })
  })

  test('accepts comma decimals and rounds calories up to whole numbers', () => {
    const data = parsed(
      form({ per100gEnabled: true, per100g: per100g({ kcal: '92,2', protein: '1,3' }) }),
    )

    expect(data.ingredient).toMatchObject({ kcal_100: 93, protein_100: 1.3 })
  })

  test('per unit with unit name and grams per unit', () => {
    const data = parsed(
      form({
        perUnitEnabled: true,
        perUnit: perUnit({ kcal: '210', protein: '20' }),
        unitLabel: 'bar',
        unitWeightG: '60',
      }),
    )

    expect(data.ingredient).toMatchObject({
      kcal_100: null,
      kcal_unit: 210,
      protein_unit: 20,
      unit_label: 'bar',
      unit_weight_g: 60,
    })
  })

  test('values typed into a switched-off section are ignored', () => {
    const data = parsed(
      form({
        per100gEnabled: true,
        per100g: per100g({ kcal: '100' }),
        perUnitEnabled: false,
        perUnit: perUnit({ kcal: '50', protein: '3' }),
      }),
    )

    expect(data.ingredient).toMatchObject({ kcal_unit: null, protein_unit: null })
  })

  test('needs at least one section with calories', () => {
    expect(errorsOf(form({}))).toEqual({ per100gEnabled: 'Add calories per 100 g or per unit' })
    expect(errorsOf(form({ perUnitEnabled: true }))).toEqual({
      'perUnit.kcal': 'Enter the calories',
    })
  })

  test('rejects text, negative numbers and more than 100 g per 100 g', () => {
    const errors = errorsOf(
      form({
        per100gEnabled: true,
        per100g: per100g({ kcal: 'lots', fat: '-1', protein: '120' }),
      }),
    )

    expect(errors).toEqual({
      'per100g.kcal': 'Enter a number',
      'per100g.fat': 'Enter a number',
      'per100g.protein': 'At most 100 g per 100 g',
    })
  })

  test('rejects values too large for the database columns', () => {
    const errors = errorsOf(
      form({
        perUnitEnabled: true,
        perUnit: perUnit({ kcal: '100000', fat: '100000' }),
        unitWeightG: '100000',
      }),
    )

    expect(errors).toEqual({
      'perUnit.kcal': 'Too large',
      'perUnit.fat': 'Too large',
      unitWeightG: 'Too large',
    })
  })

  test('requires a name and a positive unit weight', () => {
    const errors = errorsOf(
      form({ name: ' ', per100gEnabled: true, per100g: per100g({ kcal: '1' }), unitWeightG: '0' }),
    )

    expect(errors).toEqual({ name: 'Enter a name', unitWeightG: 'Must be more than 0' })
  })

  test('category: existing, or a new one that needs a name', () => {
    const base = { per100gEnabled: true, per100g: per100g({ kcal: '1' }) }

    expect(parsed(form({ ...base, categoryId: 'c1' })).category).toEqual({
      kind: 'existing',
      id: 'c1',
    })
    expect(
      parsed(form({ ...base, categoryId: NEW_CATEGORY, newCategoryName: ' Dairy ' })).category,
    ).toEqual({ kind: 'new', name: 'Dairy', groupId: null })
    expect(
      parsed(
        form({
          ...base,
          categoryId: NEW_CATEGORY,
          newCategoryName: 'Dairy',
          newCategoryGroupId: 'g1',
        }),
      ).category,
    ).toEqual({ kind: 'new', name: 'Dairy', groupId: 'g1' })
    expect(errorsOf(form({ ...base, categoryId: NEW_CATEGORY }))).toEqual({
      newCategoryName: 'Enter a category name',
    })
  })
})

describe('barcode', () => {
  const withCalories = { per100gEnabled: true, per100g: per100g({ kcal: '539' }) }

  test('a barcode is optional, stored without spaces, UPC-A as EAN-13', () => {
    expect(parsed(form(withCalories)).ingredient.barcode).toBeNull()
    expect(parsed(form({ ...withCalories, barcode: ' 3017620 422003 ' })).ingredient.barcode).toBe(
      '3017620422003',
    )
    expect(parsed(form({ ...withCalories, barcode: '036000291452' })).ingredient.barcode).toBe(
      '0036000291452',
    )
  })

  test('a mistyped barcode is pointed out', () => {
    expect(errorsOf(form({ ...withCalories, barcode: '3017620422004' })).barcode).toBe(
      'Not a valid barcode',
    )
  })
})

describe('toFormValues', () => {
  test('turns a stored ingredient back into editable text', () => {
    const values = toFormValues(
      ingredient({
        name: 'Protein bar',
        brand: 'X',
        category_id: 'c1',
        note: 'gym',
        kcal_unit: 210,
        protein_unit: 20.5,
        unit_label: 'bar',
        unit_weight_g: 60,
      }),
    )

    expect(values).toMatchObject({
      name: 'Protein bar',
      brand: 'X',
      categoryId: 'c1',
      note: 'gym',
      per100gEnabled: false,
      perUnitEnabled: true,
      unitLabel: 'bar',
      unitWeightG: '60',
    })
    expect(values.perUnit).toMatchObject({ kcal: '210', protein: '20.5', fat: '' })
  })

  test('round-trips through the parser unchanged', () => {
    const stored = ingredient({ name: 'Egg', kcal_100: 155, protein_100: 13, unit_weight_g: 58 })

    expect(parsed(toFormValues(stored)).ingredient).toMatchObject({
      name: 'Egg',
      kcal_100: 155,
      protein_100: 13,
      unit_weight_g: 58,
    })
  })
})

describe('calculateMissingValues', () => {
  test('per unit is worked out from per 100 g and the grams per unit', () => {
    const result = calculateMissingValues(
      form({
        per100gEnabled: true,
        per100g: per100g({ kcal: '142', protein: '5,6', fiber: '47.3' }),
        unitWeightG: '50',
      }),
    )

    expect(result).toEqual({
      kind: 'filled',
      count: 3,
      values: expect.objectContaining({
        perUnitEnabled: true,
        perUnit: perUnit({ kcal: '71', protein: '2.8', fiber: '23.65' }),
      }),
    })
  })

  test('per 100 g is worked out from per unit, field by field; typed values are never replaced', () => {
    const result = calculateMissingValues(
      form({
        per100gEnabled: true,
        per100g: per100g({ kcal: '150' }),
        perUnitEnabled: true,
        perUnit: perUnit({ kcal: '80', protein: '4', salt: '0.1' }),
        unitWeightG: '40',
      }),
    )

    expect(result).toMatchObject({
      kind: 'filled',
      count: 2,
      values: {
        per100g: per100g({ kcal: '150', protein: '10', salt: '0.25' }),
        perUnit: perUnit({ kcal: '80', protein: '4', salt: '0.1' }),
      },
    })
  })

  test('a switched-off section is not used as a source', () => {
    const result = calculateMissingValues(
      form({
        per100gEnabled: false,
        per100g: per100g({ kcal: '142' }),
        unitWeightG: '50',
      }),
    )

    expect(result).toEqual({ kind: 'nothing' })
  })

  test('needs a weight first', () => {
    const values = form({ per100gEnabled: true, per100g: per100g({ kcal: '142' }) })

    expect(calculateMissingValues(values)).toEqual({ kind: 'needsWeight' })
    expect(calculateMissingValues({ ...values, unitWeightG: '0' })).toEqual({ kind: 'needsWeight' })
    expect(calculateMissingValues({ ...values, unitWeightG: 'abc' })).toEqual({
      kind: 'needsWeight',
    })
  })
})
