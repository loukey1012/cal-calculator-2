import { describe, expect, test } from 'vitest'
import {
  calculateMissingValues,
  clearBasis,
  clearBasisField,
  fillEmptyFrom,
  filledCount,
  portionCount,
  splitPerUnit,
  withNutritionOf,
} from './formActions'
import { EMPTY_INGREDIENT_FORM, type IngredientFormValues } from './ingredientForm'

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
      kcalFromMacros: false,
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

  test('calories are worked out from protein, carbs and fat, and marked as an estimate', () => {
    const result = calculateMissingValues(
      form({
        per100gEnabled: true,
        per100g: per100g({ protein: '10', carbs: '20', fat: '5', fiber: '2' }),
      }),
    )

    // 10 × 4 + 20 × 4 + 5 × 9 + 2 × 2
    expect(result).toEqual({
      kind: 'filled',
      count: 1,
      kcalFromMacros: true,
      values: expect.objectContaining({
        per100g: per100g({ kcal: '169', protein: '10', carbs: '20', fat: '5', fiber: '2' }),
        kcalEstimated: true,
      }),
    })
  })

  test('typed calories are never replaced by ones from the macros', () => {
    const values = form({
      per100gEnabled: true,
      per100g: per100g({ kcal: '150', protein: '10', carbs: '20', fat: '5' }),
    })

    expect(calculateMissingValues(values)).toEqual({ kind: 'needsWeight' })
  })

  test('the grams per unit are worked out from both calories, then the rest is filled in', () => {
    const result = calculateMissingValues(
      form({
        per100gEnabled: true,
        per100g: per100g({ kcal: '400', protein: '8' }),
        perUnitEnabled: true,
        perUnit: perUnit({ kcal: '40' }),
      }),
    )

    expect(result).toMatchObject({
      kind: 'filled',
      count: 2,
      kcalFromMacros: false,
      values: { unitWeightG: '10', perUnit: perUnit({ kcal: '40', protein: '0.8' }) },
    })
  })
})

describe('clearing values', () => {
  const filled = form({
    per100gEnabled: true,
    per100g: per100g({ kcal: '92', protein: '3.4', sugar: '' }),
    perUnitEnabled: true,
    perUnit: perUnit({ kcal: '46' }),
  })

  test('one value of one section', () => {
    const cleared = clearBasisField(filled, 'per100g', 'protein')

    expect(cleared.per100g).toEqual(per100g({ kcal: '92' }))
    expect(cleared.perUnit).toEqual(filled.perUnit)
    expect(filled.per100g.protein).toBe('3.4')
  })

  test('a whole section; it stays switched on for the right values', () => {
    const cleared = clearBasis(filled, 'per100g')

    expect(cleared.per100g).toEqual(EMPTY_INGREDIENT_FORM.per100g)
    expect(cleared.per100gEnabled).toBe(true)
    expect(cleared.perUnit).toEqual(filled.perUnit)
  })

  test('counts the values a section has; a switched-off one has none', () => {
    expect(filledCount(filled, 'per100g')).toBe(2)
    expect(filledCount({ ...filled, perUnitEnabled: false }, 'perUnit')).toBe(0)
  })
})

describe('splitting a portion into units', () => {
  test('every value per unit and the grams per unit are divided; per 100 g stays', () => {
    const portion = form({
      per100gEnabled: true,
      per100g: per100g({ kcal: '480' }),
      perUnitEnabled: true,
      perUnit: perUnit({ kcal: '144', protein: '2,1', fat: '' }),
      unitWeightG: '30',
    })

    const split = splitPerUnit(portion, 3)

    expect(split.perUnit).toEqual(perUnit({ kcal: '48', protein: '0.7', fat: '' }))
    expect(split.unitWeightG).toBe('10')
    expect(split.per100g).toEqual(portion.per100g)
  })

  test('nothing changes for 1, 0 or a negative count', () => {
    const portion = form({ perUnitEnabled: true, perUnit: perUnit({ kcal: '144' }) })

    expect(splitPerUnit(portion, 1)).toBe(portion)
    expect(splitPerUnit(portion, 0)).toBe(portion)
    expect(splitPerUnit(portion, -2)).toBe(portion)
  })

  test.each([
    ['3 Kekse (30 g)', 3],
    ['2 x 25 g', 2],
    ['4 Stück', 4],
    ['30 g', null],
    ['30g', null],
    ['250 ml', null],
    ['1 Riegel (40 g)', null],
    ['', null],
    [null, null],
  ])('the units in the package portion "%s": %s', (text, count) => {
    expect(portionCount(text)).toBe(count)
  })
})

describe('filling in from another source', () => {
  const skyr = form({
    name: 'Skyr',
    brand: 'Milbona',
    barcode: '20692285',
    per100gEnabled: true,
    per100g: per100g({ kcal: '62', protein: '11' }),
    unitWeightG: '150',
    unitLabel: 'cup',
    kcalEstimated: true,
  })

  test('takes over the nutrition and unit; name and brand only when empty; never the barcode', () => {
    const typed = form({
      name: 'Bakery skyr',
      brand: '',
      perUnitEnabled: true,
      perUnit: perUnit({ kcal: '99' }),
    })

    expect(withNutritionOf(typed, skyr)).toMatchObject({
      name: 'Bakery skyr',
      brand: 'Milbona',
      barcode: '',
      per100gEnabled: true,
      per100g: skyr.per100g,
      perUnitEnabled: false,
      perUnit: EMPTY_INGREDIENT_FORM.perUnit,
      unitWeightG: '150',
      unitLabel: 'cup',
      kcalEstimated: true,
    })
  })

  test('only the empty fields of a saved ingredient are filled in', () => {
    const saved = form({
      name: 'My skyr',
      per100gEnabled: true,
      per100g: per100g({ kcal: '60' }),
    })

    const { values, count } = fillEmptyFrom(saved, skyr)

    expect(count).toBe(4)
    expect(values).toMatchObject({
      name: 'My skyr',
      brand: 'Milbona',
      per100g: per100g({ kcal: '60', protein: '11' }),
      unitWeightG: '150',
      unitLabel: 'cup',
      kcalEstimated: false,
    })
  })
})
