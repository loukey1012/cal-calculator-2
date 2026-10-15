import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeQuery } from '../../test/fakeQuery'

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { ApiError } from '../../lib/errors'
import { gramsItem } from '../dishes/testData'
import { fetchRecentDishIds, fetchRecentItems, updateItemValues } from './recentMealsApi'

const DB_ERROR = { message: 'permission denied', code: '42501' }

beforeEach(() => vi.clearAllMocks())

describe('fetchRecentItems', () => {
  test('loads the plain food logged with the ingredient since a day, with its meal', async () => {
    // Arrange
    const row = {
      ...gramsItem('Skyr', 200, 62),
      id: 'item-1',
      meal_id: 'meal-1',
      dish_portion_id: null,
      dish_line_id: null,
      created_at: '',
      meals: { user_id: 'her', date: '2026-10-14', meal_type: 'breakfast' },
    }
    const query = fakeQuery({ data: [row], error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    // Act
    const items = await fetchRecentItems('skyr', '2026-10-02')

    // Assert
    expect(supabaseMock.from).toHaveBeenCalledWith('meal_items')
    expect(query.eq).toHaveBeenCalledWith('ingredient_id', 'skyr')
    expect(query.is).toHaveBeenCalledWith('dish_portion_id', null)
    expect(query.gte).toHaveBeenCalledWith('meals.date', '2026-10-02')
    expect(items).toEqual([
      {
        id: 'item-1',
        item: gramsItem('Skyr', 200, 62),
        meal: { userId: 'her', date: '2026-10-14', mealType: 'breakfast' },
      },
    ])
  })

  test('a failed load is reported', async () => {
    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: null, error: DB_ERROR }))

    await expect(fetchRecentItems('skyr', '2026-10-02')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('fetchRecentDishIds', () => {
  test('finds the dishes with the ingredient that someone ate since that day', async () => {
    const lines = fakeQuery({
      data: [{ dish_id: 'dish-1' }, { dish_id: 'dish-1' }, { dish_id: 'dish-2' }],
      error: null,
    })
    const portions = fakeQuery({
      data: [{ dish_id: 'dish-2' }, { dish_id: 'dish-2' }],
      error: null,
    })
    supabaseMock.from.mockReturnValueOnce(lines).mockReturnValueOnce(portions)

    await expect(fetchRecentDishIds('skyr', '2026-10-02')).resolves.toEqual(['dish-2'])

    expect(supabaseMock.from).toHaveBeenNthCalledWith(1, 'dish_lines')
    expect(lines.eq).toHaveBeenCalledWith('ingredient_id', 'skyr')
    expect(supabaseMock.from).toHaveBeenNthCalledWith(2, 'dish_portions')
    expect(portions.in).toHaveBeenCalledWith('dish_id', ['dish-1', 'dish-2'])
    expect(portions.gte).toHaveBeenCalledWith('date', '2026-10-02')
  })

  test('asks for no portions when no dish has the ingredient', async () => {
    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: [], error: null }))

    await expect(fetchRecentDishIds('skyr', '2026-10-02')).resolves.toEqual([])
    expect(supabaseMock.from).toHaveBeenCalledTimes(1)
  })
})

describe('updateItemValues', () => {
  test('writes the rebuilt values onto the logged food', async () => {
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)
    const values = gramsItem('Skyr', 200, 70)

    await updateItemValues('item-1', values)

    expect(query.update).toHaveBeenCalledWith(values)
    expect(query.eq).toHaveBeenCalledWith('id', 'item-1')
  })

  test('a refused update is reported', async () => {
    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: null, error: DB_ERROR }))

    await expect(updateItemValues('item-1', gramsItem('Skyr', 200, 70))).rejects.toBeInstanceOf(
      ApiError,
    )
  })
})
