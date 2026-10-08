import { describe, expect, test } from 'vitest'
import { describeGoal, EMPTY_GOAL_FORM, parseGoalForm, toGoalFormValues } from './goalForm'

describe('parseGoalForm', () => {
  test('only calories are required; macros are optional', () => {
    expect(parseGoalForm({ ...EMPTY_GOAL_FORM, kcal: '2000' })).toEqual({
      success: true,
      data: { kcal: 2000, proteinG: null, carbsG: null, fatG: null, fiberG: null },
    })
  })

  test('accepts comma decimals for grams and rounds calories up', () => {
    expect(
      parseGoalForm({ kcal: '1999,2', protein: '120,5', carbs: '200', fat: '', fiber: '' }),
    ).toEqual({
      success: true,
      data: { kcal: 2000, proteinG: 120.5, carbsG: 200, fatG: null, fiberG: null },
    })
  })

  test('explains what is wrong', () => {
    expect(
      parseGoalForm({ kcal: '', protein: 'lots', carbs: '100000', fat: '', fiber: '' }),
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
        fiberG: 30,
      }),
    ).toEqual({ kcal: '2000', protein: '120', carbs: '', fat: '60.5', fiber: '30' })
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
        fiberG: 30,
      }),
    ).toBe('2,000 kcal · P 120 g · F 60.5 g · Fib 30 g')
    expect(describeGoal(null)).toBe('Not set')
  })
})
