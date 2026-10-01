import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeQuery } from '../../test/fakeQuery'

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn(), rpc: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { ApiError } from '../../lib/errors'
import { addMealItem, deleteMealItem, fetchDay, updateMealItem } from './mealsApi'
import { dayMeal, mealItem } from './testData'

const DRAFT = {
  ingredient_id: 'i1',
  name: 'Cream',
  brand: null,
  entered_amount: 150,
  entered_unit: 'g' as const,
  basis: 'per_100g' as const,
  basis_multiplier: 1.5,
  kcal: 92,
  protein: 1.3,
  carbs: null,
  sugar: null,
  fat: null,
  sat_fat: null,
  fiber: null,
  salt: null,
}
const DB_ERROR = { message: 'permission denied', code: '42501' }

beforeEach(() => vi.clearAllMocks())

describe('mealsApi', () => {
  test('fetchDay loads one user’s meals of a day with their items in logging order', async () => {
    const day = [dayMeal('m1', 'lunch', [mealItem({})])]
    const query = fakeQuery({ data: day, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(fetchDay('u1', '2026-10-01')).resolves.toEqual(day)
    expect(supabaseMock.from).toHaveBeenCalledWith('meals')
    expect(query.select).toHaveBeenCalledWith('id, meal_type, meal_items(*)')
    expect(query.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(query.eq).toHaveBeenCalledWith('date', '2026-10-01')
    expect(query.order).toHaveBeenCalledWith('created_at', { referencedTable: 'meal_items' })
  })

  test('addMealItem makes sure the meal exists, then inserts the item under its client id', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: 'meal-1', error: null })
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await addMealItem({
      id: 'item-1',
      userId: 'u1',
      date: '2026-10-01',
      mealType: 'lunch',
      draft: DRAFT,
    })

    expect(supabaseMock.rpc).toHaveBeenCalledWith('ensure_meal', {
      p_user_id: 'u1',
      p_date: '2026-10-01',
      p_meal_type: 'lunch',
    })
    // a retried request must not create a second item
    expect(query.upsert).toHaveBeenCalledWith(
      { ...DRAFT, id: 'item-1', meal_id: 'meal-1' },
      { onConflict: 'id', ignoreDuplicates: true },
    )
  })

  test('addMealItem stops when the meal cannot be created', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: DB_ERROR })

    await expect(
      addMealItem({ id: 'x', userId: 'u1', date: '2026-10-01', mealType: 'lunch', draft: DRAFT }),
    ).rejects.toBeInstanceOf(ApiError)
    expect(supabaseMock.from).not.toHaveBeenCalled()
  })

  test('updateMealItem patches the amount by id', async () => {
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await updateMealItem('item-1', { entered_amount: 200, basis_multiplier: 2 })

    expect(supabaseMock.from).toHaveBeenCalledWith('meal_items')
    expect(query.update).toHaveBeenCalledWith({ entered_amount: 200, basis_multiplier: 2 })
    expect(query.eq).toHaveBeenCalledWith('id', 'item-1')
  })

  test('deleteMealItem deletes by id', async () => {
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await deleteMealItem('item-1')

    expect(query.delete).toHaveBeenCalled()
    expect(query.eq).toHaveBeenCalledWith('id', 'item-1')
  })

  test.each([
    ['fetchDay', () => fetchDay('u1', '2026-10-01')],
    ['updateMealItem', () => updateMealItem('i', { entered_amount: 1, basis_multiplier: 1 })],
    ['deleteMealItem', () => deleteMealItem('i')],
  ])('%s turns database errors into ApiError', async (_name, call) => {
    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: null, error: DB_ERROR }))

    await expect(call()).rejects.toBeInstanceOf(ApiError)
  })

  test('addMealItem surfaces item insert errors', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: 'meal-1', error: null })
    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: null, error: DB_ERROR }))

    await expect(
      addMealItem({ id: 'x', userId: 'u1', date: '2026-10-01', mealType: 'lunch', draft: DRAFT }),
    ).rejects.toBeInstanceOf(ApiError)
  })
})
