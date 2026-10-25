import { describe, expect, test } from 'vitest'
import type { Goal } from '../nutrition/goals'
import { referenceTable, trackedNutrients } from './referenceValues'
import { ingredient } from './testData'

const GOAL: Goal = {
  validFrom: '2026-10-01',
  kcal: 2000,
  proteinG: 150,
  carbsG: null,
  fatG: 70,
  fiberG: 30,
  weightGoalKg: null,
}

const BAR = ingredient({
  name: 'Protein bar',
  kcal_100: 350,
  protein_100: 30,
  fat_100: 12.5,
  fiber_100: null,
  kcal_unit: 210,
  protein_unit: 18,
  fat_unit: 7.5,
  fiber_unit: 3,
  unit_label: 'bar',
})

describe('trackedNutrients', () => {
  test('calories, then each nutrient the goal has a target for, in the goal’s order', () => {
    expect(trackedNutrients(GOAL)).toEqual(['kcal', 'protein', 'fat', 'fiber'])
  })

  test('only calories without a goal', () => {
    expect(trackedNutrients(null)).toEqual(['kcal'])
  })
})

describe('referenceTable', () => {
  test('a row per 100 g and per unit with the tracked values', () => {
    expect(referenceTable(BAR, ['kcal', 'protein', 'fat', 'fiber'], 'en')).toEqual({
      nutrients: ['kcal', 'protein', 'fat', 'fiber'],
      rows: [
        { basis: '100 g', values: ['350', '30.0', '12.5', '–'] },
        { basis: '1 bar', values: ['210', '18.0', '7.5', '3.0'] },
      ],
    })
  })

  test('per 100 ml for drinks, "1 unit" without a unit name, and only the bases it has', () => {
    const milk = ingredient({ kcal_100: 64, measure: 'ml' })
    const egg = ingredient({ kcal_unit: 90 })

    expect(referenceTable(milk, ['kcal'], 'en')?.rows).toEqual([
      { basis: '100 ml', values: ['64'] },
    ])
    expect(referenceTable(egg, ['kcal'], 'en')?.rows).toEqual([{ basis: '1 unit', values: ['90'] }])
  })

  test('"~" before calories that are an estimate', () => {
    const pizza = ingredient({ kcal_unit: 900, kcal_estimated: true, unit_label: 'pizza' })

    expect(referenceTable(pizza, ['kcal'], 'en')?.rows).toEqual([
      { basis: '1 pizza', values: ['~900'] },
    ])
  })

  test('nothing when the ingredient has no values at all', () => {
    expect(referenceTable(ingredient({}), ['kcal'], 'en')).toBeNull()
  })
})
