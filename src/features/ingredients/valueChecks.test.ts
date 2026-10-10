import { describe, expect, test } from 'vitest'
import { EMPTY_INGREDIENT_FORM, type IngredientFormValues } from './ingredientForm'
import { flaggedFields, valueWarnings } from './valueChecks'

function form(overrides: Partial<IngredientFormValues>): IngredientFormValues {
  return { ...EMPTY_INGREDIENT_FORM, name: 'Gummies', ...overrides }
}

const basis = (values: Partial<IngredientFormValues['per100g']>) => ({
  ...EMPTY_INGREDIENT_FORM.per100g,
  ...values,
})

// Cola Bottles: per 100 g and per 50 g portion, as on the package
const GUMMIES = form({
  per100gEnabled: true,
  per100g: basis({
    kcal: '142',
    protein: '5.6',
    carbs: '6.2',
    sugar: '1.3',
    fat: '0.5',
    fiber: '47.3',
  }),
  perUnitEnabled: true,
  perUnit: basis({
    kcal: '71',
    protein: '2.8',
    carbs: '3.1',
    sugar: '0.65',
    fat: '0.25',
    fiber: '23.65',
  }),
  unitWeightG: '50',
})

const texts = (values: IngredientFormValues) => valueWarnings(values).map(({ text }) => text)

describe('valueWarnings', () => {
  test('values that fit together have none', () => {
    expect(valueWarnings(GUMMIES)).toEqual([])
  })

  test('per unit not matching per 100 g and the grams per unit points at the grams', () => {
    const warnings = valueWarnings({ ...GUMMIES, perUnit: { ...GUMMIES.perUnit, kcal: '100' } })

    expect(warnings).toContainEqual({
      text: expect.stringMatching(/per unit don’t match the values per 100 g/),
      fields: ['unitWeightG'],
    })
  })

  test('calories that don’t fit protein, carbs, fat and fiber', () => {
    const warnings = valueWarnings(
      form({
        per100gEnabled: true,
        per100g: basis({ kcal: '500', protein: '10', carbs: '10', fat: '1' }),
      }),
    )

    expect(warnings).toEqual([
      {
        text: 'Calories don’t fit protein, carbs and fat (about 89 kcal per 100 g expected).',
        fields: ['per100g.kcal'],
      },
    ])
  })

  test('more than 100 g of nutrients in 100 g, and impossible calories', () => {
    const warnings = valueWarnings(
      form({ per100gEnabled: true, per100g: basis({ kcal: '950', protein: '60', carbs: '70' }) }),
    )

    expect(warnings.map(({ text }) => text)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/more than 100 g/),
        expect.stringMatching(/more than 900 kcal/i),
      ]),
    )
    expect(flaggedFields(warnings)).toEqual(
      new Set(['per100g.kcal', 'per100g.protein', 'per100g.carbs']),
    )
  })

  test('sugar above carbs and saturated fat above fat, per 100 g and per unit', () => {
    const odd = basis({ kcal: '100', carbs: '5', sugar: '8', fat: '1', sat_fat: '2' })

    expect(
      texts(form({ per100gEnabled: true, per100g: odd, perUnitEnabled: true, perUnit: odd })),
    ).toEqual(
      expect.arrayContaining([
        'More sugar than carbs per 100 g.',
        'More saturated fat than fat per 100 g.',
        'More sugar than carbs per unit.',
        'More saturated fat than fat per unit.',
      ]),
    )
  })

  test('a switched-off section and text that isn’t a number is not checked', () => {
    const odd = basis({ kcal: '100', carbs: '5', sugar: '8' })

    expect(valueWarnings(form({ per100gEnabled: false, per100g: odd }))).toEqual([])
    expect(
      valueWarnings(form({ per100gEnabled: true, per100g: { ...odd, sugar: 'abc' } })),
    ).toEqual([])
  })
})
