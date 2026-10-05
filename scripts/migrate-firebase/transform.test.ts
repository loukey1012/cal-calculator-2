import { describe, expect, test } from 'vitest'
import { transformFood, transformFoods } from './transform.ts'

// shape of a document in the old Firebase `foods` collection
const CREAM = {
  brand: 'Milbona',
  cal_100: 92,
  cal_unit: null,
  category: 'Dairy',
  created_at: '2026-06-13T06:32:13.475+00:00',
  household_id: '07acc588-0d23-40fd-ab78-ad74771a16dd',
  id: '4bc5054f-8219-4f57-9290-f58ec017e001',
  name: '7% cream',
  note: '',
  prot_100: 1.3,
  prot_unit: null,
  weight_unit: null,
}

describe('transformFood', () => {
  test('maps the old fields to ingredient columns', () => {
    expect(transformFood('doc-1', CREAM)).toEqual({
      ok: true,
      ingredient: {
        legacy_id: 'doc-1',
        name: '7% cream',
        brand: 'Milbona',
        note: null,
        categoryName: 'Dairy',
        kcal_100: 92,
        protein_100: 1.3,
        kcal_unit: null,
        protein_unit: null,
        unit_weight_g: null,
        created_at: '2026-06-13T06:32:13.475+00:00',
      },
    })
  })

  test('per-unit foods keep their unit weight; calories are rounded up', () => {
    const result = transformFood('bar', {
      ...CREAM,
      name: ' Protein bar ',
      cal_100: null,
      prot_100: null,
      cal_unit: 210.4,
      prot_unit: 20,
      weight_unit: 60,
      note: ' gym ',
    })

    expect(result).toMatchObject({
      ok: true,
      ingredient: {
        name: 'Protein bar',
        note: 'gym',
        kcal_100: null,
        kcal_unit: 211,
        protein_unit: 20,
        unit_weight_g: 60,
      },
    })
  })

  test('numbers stored as text and empty strings are understood', () => {
    const result = transformFood('x', { ...CREAM, cal_100: '92,5', prot_100: '', brand: '  ' })

    expect(result).toMatchObject({
      ok: true,
      ingredient: { kcal_100: 93, protein_100: null, brand: null },
    })
  })

  test('a zero or missing unit weight means unknown', () => {
    expect(transformFood('x', { ...CREAM, weight_unit: 0 })).toMatchObject({
      ingredient: { unit_weight_g: null },
    })
    expect(transformFood('x', { name: 'Plain', cal_100: 10 })).toMatchObject({
      ok: true,
      ingredient: { brand: null, categoryName: null, created_at: null },
    })
  })

  test.each([
    [{ ...CREAM, name: '  ' }, 'no name'],
    [{ ...CREAM, cal_100: null, cal_unit: null }, 'no calories'],
    [
      { ...CREAM, cal_100: null, prot_100: 5, cal_unit: 100 },
      'protein per 100 g without calories per 100 g',
    ],
    [{ ...CREAM, cal_unit: null, prot_unit: 4 }, 'protein per unit without calories per unit'],
    [{ ...CREAM, cal_100: 'lots' }, 'cal_100 is not a number'],
    [{ ...CREAM, prot_100: -1 }, 'prot_100 is negative'],
    [{ ...CREAM, prot_100: 120 }, 'more than 100 g protein per 100 g'],
    [{ ...CREAM, name: 'x'.repeat(101) }, 'name is longer than 100 characters'],
  ])('skips unusable data with a reason (%#)', (data, reason) => {
    expect(transformFood('bad', data)).toEqual({
      ok: false,
      skipped: { id: 'bad', name: expect.any(String), reason },
    })
  })

  test('an invalid created_at is dropped rather than failing the food', () => {
    expect(transformFood('x', { ...CREAM, created_at: 'yesterday' })).toMatchObject({
      ok: true,
      ingredient: { created_at: null },
    })
  })
})

describe('transformFoods', () => {
  test('splits usable foods from skipped ones and collects categories once, ignoring case', () => {
    const result = transformFoods([
      { id: 'a', data: CREAM },
      { id: 'b', data: { ...CREAM, name: 'Milk', category: 'dairy ' } },
      { id: 'c', data: { ...CREAM, name: 'Bread', category: 'Bakery' } },
      { id: 'd', data: { name: 'Nothing' } },
    ])

    expect(result.ingredients.map((item) => item.legacy_id)).toEqual(['a', 'b', 'c'])
    expect(result.skipped).toEqual([{ id: 'd', name: 'Nothing', reason: 'no calories' }])
    expect(result.categories).toEqual(['Dairy', 'Bakery'])
    expect(result.ingredients[1]?.categoryName).toBe('dairy')
  })
})
