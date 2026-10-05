import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeQuery } from '../../test/fakeQuery'

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { ApiError } from '../../lib/errors'
import {
  createCategory,
  createIngredient,
  deleteIngredient,
  fetchCategories,
  fetchCategoryGroups,
  fetchIngredients,
  updateIngredient,
} from './ingredientsApi'
import { category, categoryGroup, ingredient } from './testData'

const CREAM = ingredient({ id: 'i1', name: 'Cream', kcal_100: 92 })
const INPUT = { name: 'Cream', kcal_100: 92, category_id: null }
const DB_ERROR = { message: 'permission denied', code: '42501' }

beforeEach(() => vi.clearAllMocks())

describe('ingredientsApi', () => {
  test('fetchIngredients lists the household’s ingredients by name', async () => {
    const query = fakeQuery({ data: [CREAM], error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(fetchIngredients('h1')).resolves.toEqual([CREAM])
    expect(supabaseMock.from).toHaveBeenCalledWith('ingredients')
    expect(query.eq).toHaveBeenCalledWith('household_id', 'h1')
    expect(query.order).toHaveBeenCalledWith('name')
  })

  test('fetchCategories lists the household’s categories by name', async () => {
    const query = fakeQuery({ data: [category('c1', 'Dairy')], error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(fetchCategories('h1')).resolves.toHaveLength(1)
    expect(supabaseMock.from).toHaveBeenCalledWith('categories')
    expect(query.order).toHaveBeenCalledWith('name')
  })

  test('fetchCategoryGroups lists the household’s broad categories by name', async () => {
    const query = fakeQuery({ data: [categoryGroup('g1', 'Fresh')], error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(fetchCategoryGroups('h1')).resolves.toHaveLength(1)
    expect(supabaseMock.from).toHaveBeenCalledWith('category_groups')
    expect(query.eq).toHaveBeenCalledWith('household_id', 'h1')
    expect(query.order).toHaveBeenCalledWith('name')
  })

  test('createIngredient inserts into the household and returns the row', async () => {
    const query = fakeQuery({ data: CREAM, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(createIngredient('h1', INPUT)).resolves.toEqual(CREAM)
    expect(query.insert).toHaveBeenCalledWith({ ...INPUT, household_id: 'h1' })
  })

  test('updateIngredient updates by id', async () => {
    const query = fakeQuery({ data: CREAM, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(updateIngredient('i1', INPUT)).resolves.toEqual(CREAM)
    expect(query.update).toHaveBeenCalledWith(INPUT)
    expect(query.eq).toHaveBeenCalledWith('id', 'i1')
  })

  test('deleteIngredient deletes by id', async () => {
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(deleteIngredient('i1')).resolves.toBeUndefined()
    expect(query.delete).toHaveBeenCalled()
    expect(query.eq).toHaveBeenCalledWith('id', 'i1')
  })

  test('createCategory inserts a named category into a broad category', async () => {
    const query = fakeQuery({ data: category('c9', 'Snacks', 'g1'), error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(createCategory('h1', 'Snacks', 'g1')).resolves.toMatchObject({ id: 'c9' })
    expect(query.insert).toHaveBeenCalledWith({
      household_id: 'h1',
      name: 'Snacks',
      group_id: 'g1',
    })
  })

  test.each([
    ['fetchIngredients', () => fetchIngredients('h1')],
    ['fetchCategories', () => fetchCategories('h1')],
    ['fetchCategoryGroups', () => fetchCategoryGroups('h1')],
    ['createIngredient', () => createIngredient('h1', INPUT)],
    ['updateIngredient', () => updateIngredient('i1', INPUT)],
    ['deleteIngredient', () => deleteIngredient('i1')],
    ['createCategory', () => createCategory('h1', 'x', null)],
  ])('%s turns database errors into ApiError', async (_name, call) => {
    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: null, error: DB_ERROR }))

    await expect(call()).rejects.toBeInstanceOf(ApiError)
  })
})
