import { describe, expect, test } from 'vitest'
import { describeGoal, EMPTY_GOAL_FORM, parseGoalForm, toGoalFormValues } from './goalForm'

describe('parseGoalForm', () => {
  test('only calories are required; macros are optional', () => {
    expect(parseGoalForm({ ...EMPTY_GOAL_FORM, kcal: '2000' })).toEqual({
      success: true,
      data: {
        kcal: 2000,
        proteinG: null,
        carbsG: null,
        fatG: null,
        kcalBurned: null,
        fiberG: null,
        weightGoalKg: null,
      },
    })
  })

  test('accepts comma decimals for grams and rounds calories up', () => {
    expect(
      parseGoalForm({
        kcal: '1999,2',
        protein: '120,5',
        carbs: '200',
        fat: '',
        kcalBurned: '',
        fiber: '',
        weight: '',
      }),
    ).toEqual({
      success: true,
      data: {
        kcal: 2000,
        proteinG: 120.5,
        carbsG: 200,
        fatG: null,
        kcalBurned: null,
        fiberG: null,
        weightGoalKg: null,
      },
    })
  })

  test('a target weight is optional, in kg with one decimal, between 20 and 400', () => {
    expect(parseGoalForm({ ...EMPTY_GOAL_FORM, kcal: '2000', weight: '67,85' })).toMatchObject({
      success: true,
      data: { weightGoalKg: 67.9 },
    })
    expect(parseGoalForm({ ...EMPTY_GOAL_FORM, kcal: '2000', weight: '12' })).toEqual({
      success: false,
      errors: { weight: 'Between 20 and 400 kg' },
    })
  })

  test('calories burned is optional, whole, more than 0 and capped like the calorie goal', () => {
    expect(parseGoalForm({ ...EMPTY_GOAL_FORM, kcal: '2000', kcalBurned: '2600,2' })).toMatchObject(
      { success: true, data: { kcalBurned: 2601 } },
    )
    expect(parseGoalForm({ ...EMPTY_GOAL_FORM, kcal: '2000', kcalBurned: '0' })).toEqual({
      success: false,
      errors: { kcalBurned: 'Must be more than 0' },
    })
    expect(parseGoalForm({ ...EMPTY_GOAL_FORM, kcal: '2000', kcalBurned: '-5' })).toMatchObject({
      success: false,
    })
    expect(parseGoalForm({ ...EMPTY_GOAL_FORM, kcal: '2000', kcalBurned: 'lots' })).toEqual({
      success: false,
      errors: { kcalBurned: 'Enter a number' },
    })
    expect(parseGoalForm({ ...EMPTY_GOAL_FORM, kcal: '2000', kcalBurned: '100000' })).toEqual({
      success: false,
      errors: { kcalBurned: 'Too large' },
    })
  })

  test('explains what is wrong', () => {
    expect(
      parseGoalForm({
        kcal: '',
        protein: 'lots',
        carbs: '100000',
        fat: '',
        kcalBurned: '',
        fiber: '',
        weight: '',
      }),
    ).toEqual({
      success: false,
      errors: {
        kcal: 'Enter your calorie goal',
        protein: 'Enter a number',
        carbs: 'Too large',
      },
    })
    expect(parseGoalForm({ ...EMPTY_GOAL_FORM, kcal: '0' })).toEqual({
      success: false,
      errors: { kcal: 'Must be more than 0' },
    })
  })
})

describe('toGoalFormValues', () => {
  test('pre-fills the form from the current goal, or leaves it empty', () => {
    expect(
      toGoalFormValues({
        validFrom: '2026-10-01',
        kcal: 2000,
        proteinG: 120,
        carbsG: null,
        fatG: 60.5,
        kcalBurned: null,
        fiberG: 30,
        weightGoalKg: null,
      }),
    ).toEqual({
      kcal: '2000',
      protein: '120',
      carbs: '',
      fat: '60.5',
      kcalBurned: '',
      fiber: '30',
      weight: '',
    })
    expect(
      toGoalFormValues({
        validFrom: '2026-10-01',
        kcal: 2000,
        kcalBurned: 2600,
        proteinG: null,
        carbsG: null,
        fatG: null,
        fiberG: null,
        weightGoalKg: null,
      }).kcalBurned,
    ).toBe('2600')
    expect(toGoalFormValues(null)).toEqual(EMPTY_GOAL_FORM)
  })
})

describe('describeGoal', () => {
  test('summarises the targets that are set', () => {
    expect(
      describeGoal({
        validFrom: 'x',
        kcal: 2000,
        proteinG: 120,
        carbsG: null,
        fatG: 60.5,
        kcalBurned: null,
        fiberG: 30,
        weightGoalKg: 68,
      }),
    ).toBe('2,000 kcal · P 120 g · F 60.5 g · Fib 30 g · Weight 68 kg')
    expect(describeGoal(null)).toBe('Not set')
  })
})
