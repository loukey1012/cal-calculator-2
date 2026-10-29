import { describe, expect, test } from 'vitest'
import { category, ingredient } from '../ingredients/testData'
import { duplicateOf, mergeRows, takenValues } from './merge'

const OTHER_ID = '8e4d6a9f-2c3b-4d4e-8f9a-1b2c3d4e5f6a'
const CHEESE = category('c1', 'Cheese', 'g1')
const TOASTKAESE = ingredient({
  id: 'keep',
  name: 'Toastkäse',
  brand: 'S Budget',
  category_id: 'c1',
  kcal_100: 300,
  protein_100: 18,
})
const SCHEIBEN = ingredient({
  id: 'other',
  name: 'Toast-Käsescheiben',
  brand: 'S Budget',
  category_id: 'c1',
  kcal_100: 310,
  protein_100: 18,
  unit_label: 'slice',
  unit_weight_g: 20,
  barcode: '4012345678901',
})

describe('duplicateOf', () => {
  test('the other ingredient of a duplicate finding, or null without one', () => {
    expect(duplicateOf({ duplicate_of: OTHER_ID })).toBe(OTHER_ID)
    expect(duplicateOf({})).toBeNull()
    expect(duplicateOf({ duplicate_of: 'not an id' })).toBeNull()
    expect(duplicateOf(null)).toBeNull()
  })
})

describe('mergeRows', () => {
  test('both side by side, which rows differ, empty ones left out', () => {
    const rows = mergeRows(TOASTKAESE, SCHEIBEN, [CHEESE])

    expect(rows.map((row) => [row.label, row.keep, row.other, row.differs])).toEqual([
      ['Name', 'Toastkäse', 'Toast-Käsescheiben', true],
      ['Brand', 'S Budget', 'S Budget', false],
      ['Category', 'Cheese', 'Cheese', false],
      ['Measured in', 'g', 'g', false],
      ['kcal / 100', '300', '310', true],
      ['Protein / 100', '18 g', '18 g', false],
      ['Unit', '–', 'slice', true],
      ['Unit weight', '–', '20 g', true],
      ['Barcode', '–', '4012345678901', true],
      ['Estimate', 'no', 'no', false],
    ])
  })
})

describe('takenValues', () => {
  test('the taken fields with the other one’s values', () => {
    expect(takenValues(SCHEIBEN, new Set(['unit_label', 'unit_weight_g']))).toEqual({
      unit_label: 'slice',
      unit_weight_g: 20,
    })
    expect(takenValues(SCHEIBEN, new Set())).toEqual({})
  })
})

describe('mergeRows diet rows', () => {
  test('Vegan and Halal are left out when both sides are off', () => {
    const labels = mergeRows(TOASTKAESE, SCHEIBEN, [CHEESE]).map((row) => row.label)

    expect(labels).not.toContain('Vegan')
    expect(labels).not.toContain('Halal')
  })

  test('they show yes / no and which differ when one side has them', () => {
    const rows = mergeRows(TOASTKAESE, { ...SCHEIBEN, vegan: true }, [CHEESE])
    const vegan = rows.find((row) => row.label === 'Vegan')

    expect(vegan).toEqual({
      field: 'vegan',
      label: 'Vegan',
      keep: 'no',
      other: 'yes',
      differs: true,
    })
    expect(rows.some((row) => row.label === 'Halal')).toBe(false)
  })

  test('taking the other one over turns the flag on', () => {
    expect(takenValues({ ...SCHEIBEN, halal: true }, new Set(['halal']))).toEqual({ halal: true })
  })
})
