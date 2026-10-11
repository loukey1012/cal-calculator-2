import { describe, expect, test } from 'vitest'
import { sortIngredients } from './sorting'
import { ingredient } from './testData'

const names = (list: readonly { readonly name: string }[]) => list.map(({ name }) => name)

const OLD_BREAD = ingredient({
  id: 'bread',
  name: 'Bread',
  created_at: '2026-10-01T08:00:00Z',
  kcal_100: 250,
})
const NEW_SKYR = ingredient({
  id: 'skyr',
  name: 'Skyr',
  created_at: '2026-10-11T08:00:00Z',
  kcal_100: 62,
})
const MID_APPLE = ingredient({
  id: 'apple',
  name: 'Apple',
  created_at: '2026-10-05T08:00:00Z',
  kcal_100: 52,
})
const BAR = ingredient({
  id: 'bar',
  name: 'Protein bar',
  created_at: '2026-10-05T08:00:00Z',
  kcal_unit: 210,
  unit_label: 'bar',
})
const ALL = [OLD_BREAD, NEW_SKYR, MID_APPLE, BAR]
const NO_USES = {}

describe('sortIngredients', () => {
  test('newest first: the latest added on top; the same time by name', () => {
    expect(names(sortIngredients(ALL, 'newest', NO_USES))).toEqual([
      'Skyr',
      'Apple',
      'Protein bar',
      'Bread',
    ])
  })

  test('A–Z by name, ignoring case', () => {
    const lower = ingredient({ id: 'b', name: 'banana' })
    expect(names(sortIngredients([...ALL, lower], 'name', NO_USES))).toEqual([
      'Apple',
      'banana',
      'Bread',
      'Protein bar',
      'Skyr',
    ])
  })

  test('most used first; never used ones last, by name', () => {
    const uses = { bread: 3, bar: 7 }
    expect(names(sortIngredients(ALL, 'used', uses))).toEqual([
      'Protein bar',
      'Bread',
      'Apple',
      'Skyr',
    ])
  })

  test('fewest calories per 100 g first; those with values per unit only after them', () => {
    const snack = ingredient({ id: 's', name: 'Snack', kcal_unit: 90 })
    expect(names(sortIngredients([...ALL, snack], 'kcal', NO_USES))).toEqual([
      'Apple',
      'Skyr',
      'Bread',
      'Snack',
      'Protein bar',
    ])
  })

  test('leaves the list it was given as it was', () => {
    const list = [OLD_BREAD, NEW_SKYR]
    sortIngredients(list, 'newest', NO_USES)
    expect(names(list)).toEqual(['Bread', 'Skyr'])
  })
})
