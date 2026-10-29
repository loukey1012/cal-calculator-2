import { describe, expect, test } from 'vitest'
import {
  ALL_CATEGORIES,
  chipGroups,
  filterIngredients,
  groupByCategory,
  groupOfFilter,
  nutritionSummary,
} from './listing'
import { category, categoryGroup, ingredient } from './testData'

const FRIDGE = categoryGroup('g1', 'Fridge')
const PANTRY = categoryGroup('g2', 'Pantry')
const EMPTY_GROUP = categoryGroup('g3', 'Empty')
const DAIRY = category('c1', 'Dairy', 'g1')
const BAKERY = category('c2', 'Bakery', 'g2')
const CREAM = ingredient({
  id: 'cream',
  name: 'Cream 7%',
  brand: 'Milbona',
  category_id: 'c1',
  kcal_100: 92,
})
const CHEESE = ingredient({ id: 'cheese', name: 'Käse', category_id: 'c1', kcal_100: 350 })
const BREAD = ingredient({ id: 'bread', name: 'bread', category_id: 'c2', kcal_100: 250 })
// its category isn't in the list (yet)
const BAR = ingredient({ id: 'bar', name: 'Protein bar', kcal_unit: 210, unit_label: 'bar' })
const ALL = [CREAM, CHEESE, BREAD, BAR]

const CATEGORIES = [DAIRY, BAKERY]
const filter = (query: string, category = ALL_CATEGORIES, brand: string | null = null) =>
  filterIngredients(ALL, { query, category, brand }, CATEGORIES)

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
    expect(filter('', { kind: 'group', id: 'g3' })).toEqual([])
  })

  test('an ingredient of an unknown category shows only without a category filter', () => {
    expect(filter('', { kind: 'group', id: 'g2' })).toEqual([BREAD])
    expect(filter('protein')).toEqual([BAR])
  })

  test('filters by brand, ignoring case and accents, combined with the rest', () => {
    expect(filter('', ALL_CATEGORIES, 'Milbona')).toEqual([CREAM])
    expect(filter('', ALL_CATEGORIES, 'MILBONA ')).toEqual([CREAM])
    expect(filter('', { kind: 'category', id: 'c2' }, 'Milbona')).toEqual([])
    expect(filter('käse', ALL_CATEGORIES, 'Milbona')).toEqual([])
  })
})

describe('chipGroups', () => {
  test('broad categories by name with their categories; empty ones hidden', () => {
    const groups = chipGroups([PANTRY, FRIDGE, EMPTY_GROUP], CATEGORIES)

    expect(groups.map((group) => [group.id, group.name])).toEqual([
      ['g1', 'Fridge'],
      ['g2', 'Pantry'],
    ])
    expect(groups[0]?.categories).toEqual([DAIRY])
    expect(groups[1]?.categories).toEqual([BAKERY])
  })
})

describe('groupOfFilter', () => {
  const groups = chipGroups([FRIDGE, PANTRY], CATEGORIES)

  test('the picked broad category, or the one holding the picked category', () => {
    expect(groupOfFilter(groups, { kind: 'group', id: 'g2' })?.name).toBe('Pantry')
    expect(groupOfFilter(groups, { kind: 'category', id: 'c1' })?.name).toBe('Fridge')
    expect(groupOfFilter(groups, ALL_CATEGORIES)).toBeUndefined()
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

  test('per 100 ml for an ingredient measured in ml', () => {
    expect(nutritionSummary(ingredient({ kcal_100: 64, measure: 'ml' }), 'en')).toBe(
      '64 kcal / 100 ml',
    )
  })
})

describe('filterIngredients by diet', () => {
  const OATS = ingredient({ id: 'oats', name: 'Oats', vegan: true, halal: true })
  const SALAMI = ingredient({ id: 'salami', name: 'Salami', halal: false })
  const TOFU = ingredient({ id: 'tofu', name: 'Tofu', vegan: true })
  const MIXED = [OATS, SALAMI, TOFU]
  const base = { query: '', category: ALL_CATEGORIES, brand: null }

  test('without a diet filter (also an old stored filter) every ingredient passes', () => {
    expect(filterIngredients(MIXED, base)).toHaveLength(3)
    expect(filterIngredients(MIXED, { ...base, diet: {} })).toHaveLength(3)
    expect(filterIngredients(MIXED, { ...base, diet: { vegan: false } })).toHaveLength(3)
  })

  test('Vegan keeps vegan ones, Halal halal ones, both keep ones with both', () => {
    const ids = (diet: { vegan?: boolean; halal?: boolean }) =>
      filterIngredients(MIXED, { ...base, diet }).map((item) => item.id)

    expect(ids({ vegan: true })).toEqual(['oats', 'tofu'])
    expect(ids({ halal: true })).toEqual(['oats'])
    expect(ids({ vegan: true, halal: true })).toEqual(['oats'])
  })
})
