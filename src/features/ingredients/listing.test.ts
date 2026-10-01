import { describe, expect, test } from 'vitest'
import { filterIngredients, groupByCategory, nutritionSummary } from './listing'
import { category, ingredient } from './testData'

const DAIRY = category('c1', 'Dairy')
const BAKERY = category('c2', 'Bakery')
const CREAM = ingredient({
  id: 'cream',
  name: 'Cream 7%',
  brand: 'Milbona',
  category_id: 'c1',
  kcal_100: 92,
})
const CHEESE = ingredient({ id: 'cheese', name: 'Käse', category_id: 'c1', kcal_100: 350 })
const BREAD = ingredient({ id: 'bread', name: 'bread', category_id: 'c2', kcal_100: 250 })
const BAR = ingredient({ id: 'bar', name: 'Protein bar', kcal_unit: 210, unit_label: 'bar' })
const ALL = [CREAM, CHEESE, BREAD, BAR]

describe('filterIngredients', () => {
  test('without filters returns everything', () => {
    expect(filterIngredients(ALL, { query: ' ', categoryId: null })).toEqual(ALL)
  })

  test('matches name or brand, ignoring case and accents', () => {
    expect(filterIngredients(ALL, { query: 'kase', categoryId: null })).toEqual([CHEESE])
    expect(filterIngredients(ALL, { query: 'MILB', categoryId: null })).toEqual([CREAM])
  })

  test('filters by category, combined with the search', () => {
    expect(filterIngredients(ALL, { query: '', categoryId: 'c1' })).toEqual([CREAM, CHEESE])
    expect(filterIngredients(ALL, { query: 'cream', categoryId: 'c2' })).toEqual([])
  })
})

describe('groupByCategory', () => {
  test('sections sorted by category name, uncategorized last, items sorted by name', () => {
    const sections = groupByCategory(ALL, [DAIRY, BAKERY])

    expect(sections.map((section) => section.title)).toEqual(['Bakery', 'Dairy', 'Other'])
    expect(sections[1]?.ingredients.map((item) => item.id)).toEqual(['cream', 'cheese'])
    expect(sections[2]?.ingredients).toEqual([BAR])
  })

  test('omits empty sections and treats unknown categories as uncategorized', () => {
    const orphan = ingredient({ id: 'orphan', name: 'Orphan', category_id: 'deleted', kcal_100: 1 })

    expect(groupByCategory([orphan], [DAIRY])).toEqual([
      { id: 'uncategorized', title: 'Other', ingredients: [orphan] },
    ])
  })
})

describe('nutritionSummary', () => {
  test('shows calories for each basis that exists', () => {
    expect(nutritionSummary(CREAM, 'en')).toBe('92 kcal / 100 g')
    expect(nutritionSummary(BAR, 'en')).toBe('210 kcal / bar')
    expect(
      nutritionSummary(ingredient({ kcal_100: 155, kcal_unit: 90, unit_label: null }), 'en'),
    ).toBe('155 kcal / 100 g · 90 kcal / unit')
  })
})
