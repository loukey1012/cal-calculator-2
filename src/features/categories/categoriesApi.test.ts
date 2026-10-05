import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeQuery } from '../../test/fakeQuery'

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { ApiError } from '../../lib/errors'
import { category, categoryGroup } from '../ingredients/testData'
import {
  createCategoryGroup,
  deleteCategory,
  deleteCategoryGroup,
  renameCategoryGroup,
  updateCategory,
} from './categoriesApi'

const DB_ERROR = { message: 'permission denied', code: '42501' }

beforeEach(() => vi.clearAllMocks())

describe('categoriesApi', () => {
  test('createCategoryGroup inserts a named broad category into the household', async () => {
    const query = fakeQuery({ data: categoryGroup('g1', 'Fresh'), error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(createCategoryGroup('h1', 'Fresh')).resolves.toMatchObject({ id: 'g1' })
    expect(supabaseMock.from).toHaveBeenCalledWith('category_groups')
    expect(query.insert).toHaveBeenCalledWith({ household_id: 'h1', name: 'Fresh' })
  })

  test('renameCategoryGroup updates the name by id', async () => {
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await renameCategoryGroup('g1', 'Fresh Food')
    expect(supabaseMock.from).toHaveBeenCalledWith('category_groups')
    expect(query.update).toHaveBeenCalledWith({ name: 'Fresh Food' })
    expect(query.eq).toHaveBeenCalledWith('id', 'g1')
  })

  test('deleteCategoryGroup deletes by id (its categories become ungrouped in the database)', async () => {
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await deleteCategoryGroup('g1')
    expect(supabaseMock.from).toHaveBeenCalledWith('category_groups')
    expect(query.delete).toHaveBeenCalled()
    expect(query.eq).toHaveBeenCalledWith('id', 'g1')
  })

  test('updateCategory renames and moves a category', async () => {
    const query = fakeQuery({ data: category('c1', 'Milk', 'g2'), error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await updateCategory('c1', { name: 'Milk', groupId: 'g2' })
    expect(supabaseMock.from).toHaveBeenCalledWith('categories')
    expect(query.update).toHaveBeenCalledWith({ name: 'Milk', group_id: 'g2' })
    expect(query.eq).toHaveBeenCalledWith('id', 'c1')
  })

  test('deleteCategory deletes by id (its ingredients lose their category in the database)', async () => {
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await deleteCategory('c1')
    expect(supabaseMock.from).toHaveBeenCalledWith('categories')
    expect(query.delete).toHaveBeenCalled()
    expect(query.eq).toHaveBeenCalledWith('id', 'c1')
  })

  test.each([
    ['createCategoryGroup', () => createCategoryGroup('h1', 'x')],
    ['renameCategoryGroup', () => renameCategoryGroup('g1', 'x')],
    ['deleteCategoryGroup', () => deleteCategoryGroup('g1')],
    ['updateCategory', () => updateCategory('c1', { name: 'x', groupId: null })],
    ['deleteCategory', () => deleteCategory('c1')],
  ])('%s turns database errors into ApiError', async (_name, call) => {
    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: null, error: DB_ERROR }))

    await expect(call()).rejects.toBeInstanceOf(ApiError)
  })
})
