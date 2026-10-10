import { describe, expect, test } from 'vitest'
import {
  ALL_CATEGORIES,
  chipGroups,
  filterIngredients,
  groupByCategory,
  nutritionSummary,
} from './listing'
import { category, categoryGroup, ingredient } from './testData'

const FRIDGE = categoryGroup('g1', 'Fridge')
const PANTRY = categoryGroup('g2', 'Pantry')
const EMPTY_GROUP = categoryGroup('g3', 'Empty')
const DAIRY = category('c1', 'Dairy', 'g1')
const BAKERY = category('c2', 'Bakery', null)
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

const CATEGORIES = [DAIRY, BAKERY]
const filter = (query: string, category = ALL_CATEGORIES) =>
  filterIngredients(ALL, { query, category }, CATEGORIES)

describe('filterIngredients', () => {
  test('without filters returns everything', () => {
    expect(filter(' ')).toEqual(ALL)
  })

  test('matches name or brand, ignoring case and accents', () => {
    expect(filter('kase')).toEqual([CHEESE])
    expect(filter('MILB')).toEqual([CREAM])
  })

  test('filters by category, combined with the search', () => {
    expect(filter('', { kind: 'category', id: 'c1' })).toEqual([CREAM, CHEESE])
    expect(filter('cream', { kind: 'category', id: 'c2' })).toEqual([])
  })

  test('filters by broad category: every category inside it', () => {
    expect(filter('', { kind: 'group', id: 'g1' })).toEqual([CREAM, CHEESE])
    expect(filter('', { kind: 'group', id: 'g2' })).toEqual([])
  })

  test('"Other" holds ungrouped categories and ingredients without a category', () => {
    expect(filter('', { kind: 'group', id: null })).toEqual([BREAD, BAR])
  })
})

describe('chipGroups', () => {
  test('broad categories by name with their categories; empty ones hidden; Other last', () => {
    const groups = chipGroups([PANTRY, FRIDGE, EMPTY_GROUP], CATEGORIES, ALL)

    expect(groups.map((group) => [group.id, group.name])).toEqual([
      ['g1', 'Fridge'],
      [null, 'Other'],
    ])
    expect(groups[0]?.categories).toEqual([DAIRY])
    expect(groups[1]?.categories).toEqual([BAKERY])
  })

  test('Other shows for ingredients without a category even when every category is grouped', () => {
    const groups = chipGroups([FRIDGE], [DAIRY], [CREAM, BAR])

    expect(groups.map((group) => group.name)).toEqual(['Fridge', 'Other'])
    expect(groups[1]?.categories).toEqual([])
  })

  test('no Other when everything is grouped', () => {
    expect(chipGroups([FRIDGE], [DAIRY], [CREAM]).map((group) => group.name)).toEqual(['Fridge'])
  })

  test('a category pointing at an unknown broad category counts as Other', () => {
    const stray = category('c9', 'Stray', 'deleted')

    expect(chipGroups([], [stray], []).map((group) => group.categories)).toEqual([[stray]])
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
  test('guessed values get a ~', () => {
    expect(
      nutritionSummary(
        ingredient({ kcal_100: 250, kcal_unit: 900, unit_label: 'pizza', kcal_estimated: true }),
        'en',
      ),
    ).toBe('~250 kcal / 100 g · ~900 kcal / pizza')
  })

  test('shows calories for each basis that exists', () => {
    expect(nutritionSummary(CREAM, 'en')).toBe('92 kcal / 100 g')
    expect(nutritionSummary(BAR, 'en')).toBe('210 kcal / bar')
    expect(
      nutritionSummary(ingredient({ kcal_100: 155, kcal_unit: 90, unit_label: null }), 'en'),
    ).toBe('155 kcal / 100 g · 90 kcal / unit')
  })
})
