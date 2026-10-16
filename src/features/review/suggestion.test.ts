import { describe, expect, test } from 'vitest'
import { ingredient } from '../ingredients/testData'
import { SUGGESTABLE_FIELDS as SCRIPT_FIELDS } from '../../../scripts/review/findings'
import { describeChanges, suggestionPatch, SUGGESTABLE_FIELDS } from './suggestion'

const BUTTER = ingredient({
  id: 'i1',
  name: 'Buter',
  brand: 'kerrygold',
  kcal_100: 74,
  unit_label: 'slice',
  unit_weight_g: 100,
})

describe('suggestionPatch', () => {
  test('takes the fields a finding may change', () => {
    expect(
      suggestionPatch({ name: ' Butter ', brand: 'Kerrygold', kcal_100: 740, fat_unit: 8.2 }),
    ).toEqual({ name: 'Butter', brand: 'Kerrygold', kcal_100: 740, fat_unit: 8.2 })
  })

  test('leaves out anything else, e.g. the household or id', () => {
    expect(suggestionPatch({ name: 'Butter', household_id: 'h2', id: 'x' })).toEqual({
      name: 'Butter',
    })
  })

  test('a value that couldn’t be saved makes the whole fix unusable', () => {
    expect(suggestionPatch({ name: 'Butter', kcal_100: -5 })).toBeNull()
    expect(suggestionPatch({ kcal_100: 7.5 })).toBeNull()
    expect(suggestionPatch({ name: '' })).toBeNull()
    expect(suggestionPatch('Butter')).toBeNull()
  })

  test('a brand or unit can be cleared', () => {
    expect(suggestionPatch({ brand: null, unit_label: null })).toEqual({
      brand: null,
      unit_label: null,
    })
  })

  test('nothing to change: an empty fix', () => {
    expect(suggestionPatch({})).toEqual({})
  })
})

describe('describeChanges', () => {
  test('each changed field with its old and new value, in plain words', () => {
    expect(
      describeChanges(BUTTER, { name: 'Butter', kcal_100: 740, unit_weight_g: 10, brand: null }),
    ).toEqual([
      { label: 'Name', from: 'Buter', to: 'Butter' },
      { label: 'Brand', from: 'kerrygold', to: '–' },
      { label: 'Unit weight', from: '100 g', to: '10 g' },
      { label: 'Calories per 100 g', from: '74', to: '740' },
    ])
  })

  test('values that are already as suggested are not changes', () => {
    expect(describeChanges(BUTTER, { name: 'Buter', kcal_100: 74 })).toEqual([])
  })

  test('per 100 ml and ml per unit for an ingredient measured in ml', () => {
    const milk = ingredient({ id: 'i2', name: 'Milk', measure: 'ml', kcal_100: 64 })

    expect(describeChanges(milk, { kcal_100: 46, unit_weight_g: 250 })).toEqual([
      { label: 'Unit size', from: '–', to: '250 ml' },
      { label: 'Calories per 100 ml', from: '64', to: '46' },
    ])
  })
})

describe('SUGGESTABLE_FIELDS', () => {
  test('are the same fields the review script lets the routine suggest', () => {
    expect([...SUGGESTABLE_FIELDS].sort()).toEqual([...SCRIPT_FIELDS].sort())
  })
})
