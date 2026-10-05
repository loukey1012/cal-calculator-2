import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeQuery } from '../../test/fakeQuery'

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn(), rpc: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { ApiError } from '../../lib/errors'
import { deleteDish, fetchDish, saveDish } from './dishesApi'
import { gramsItem, HER_LUNCH, ME_LUNCH, testDish } from './testData'

const DB_ERROR = { message: 'permission denied', code: '42501' }

function lineRow(id: string, position: number, allocation: string, amounts: object[] = []) {
  return {
    ...gramsItem(`Line ${id}`, 200, 100),
    id,
    dish_id: 'dish-1',
    position,
    allocation,
    created_at: '',
    dish_line_amounts: amounts,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('fetchDish', () => {
  test('loads the dish with portions and lines in their order', async () => {
    // Arrange
    const row = {
      id: 'dish-1',
      household_id: 'h1',
      name: 'Noodles',
      split_mode: 'count',
      cooked_weight_g: null,
      revision: 'rev-7',
      created_by: 'me',
      created_at: '',
      updated_at: '',
      dish_portions: [
        { id: 'p-rest', position: 2, user_id: null, date: null, meal_type: null, split_value: 1 },
        {
          id: 'p-me',
          position: 0,
          user_id: 'me',
          date: ME_LUNCH.date,
          meal_type: 'lunch',
          split_value: 3,
        },
        {
          id: 'p-her',
          position: 1,
          user_id: 'her',
          date: HER_LUNCH.date,
          meal_type: 'lunch',
          split_value: 2,
        },
      ],
      dish_lines: [
        lineRow('l2', 1, 'per_portion', [
          { dish_id: 'dish-1', line_id: 'l2', portion_id: 'p-me', amount: 120 },
          { dish_id: 'dish-1', line_id: 'l2', portion_id: 'p-her', amount: 80 },
        ]),
        lineRow('l1', 0, 'shared'),
      ],
    }
    const query = fakeQuery({ data: row, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    // Act
    const dish = await fetchDish('dish-1')

    // Assert
    expect(supabaseMock.from).toHaveBeenCalledWith('dishes')
    expect(query.select).toHaveBeenCalledWith(
      '*, dish_portions(*), dish_lines(*, dish_line_amounts(*))',
    )
    expect(query.eq).toHaveBeenCalledWith('id', 'dish-1')
    expect(dish).toEqual({
      id: 'dish-1',
      name: 'Noodles',
      splitMode: 'count',
      cookedWeightG: null,
      revision: 'rev-7',
      portions: [
        { id: 'p-me', eater: ME_LUNCH, splitValue: 3 },
        { id: 'p-her', eater: HER_LUNCH, splitValue: 2 },
        { id: 'p-rest', eater: null, splitValue: 1 },
      ],
      lines: [
        { id: 'l1', allocation: 'shared', item: gramsItem('Line l1', 200, 100), amounts: {} },
        {
          id: 'l2',
          allocation: 'per_portion',
          item: gramsItem('Line l2', 200, 100),
          amounts: { 'p-me': 120, 'p-her': 80 },
        },
      ],
    })
  })

  test('is null when the dish no longer exists', async () => {
    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: null, error: null }))

    await expect(fetchDish('gone')).resolves.toBeNull()
  })

  test('turns a database error into an ApiError', async () => {
    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: null, error: DB_ERROR }))

    await expect(fetchDish('dish-1')).rejects.toEqual(new ApiError('permission denied', '42501'))
  })
})

describe('saveDish', () => {
  test('sends the whole dish, the revision it is based on and the items it replaces', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: null })
    const dish = testDish({
      portions: [
        { id: 'p-me', eater: ME_LUNCH, splitValue: null },
        { id: 'p-rest', eater: null, splitValue: null },
      ],
      lines: [
        {
          id: 'l-pasta',
          allocation: 'per_portion',
          item: gramsItem('Pasta', 220, 360),
          amounts: { 'p-me': 120, 'p-rest': 100 },
        },
      ],
    })

    await saveDish({ dish, baseRevision: 'rev-0', replaceItemIds: ['item-9'] })

    expect(supabaseMock.rpc).toHaveBeenCalledWith('save_dish', {
      p_dish: {
        id: 'dish-1',
        name: 'Chili',
        split_mode: 'equal',
        cooked_weight_g: null,
        revision: 'rev-1',
        portions: [
          { id: 'p-me', user_id: 'me', date: ME_LUNCH.date, meal_type: 'lunch', split_value: null },
          { id: 'p-rest', user_id: null, date: null, meal_type: null, split_value: null },
        ],
        lines: [
          {
            ...gramsItem('Pasta', 220, 360),
            id: 'l-pasta',
            allocation: 'per_portion',
            amounts: [
              { portion_id: 'p-me', amount: 120 },
              { portion_id: 'p-rest', amount: 100 },
            ],
          },
        ],
      },
      p_base_revision: 'rev-0',
      p_replace_item_ids: ['item-9'],
    })
  })

  test('a rejected save becomes an ApiError with its code (e.g. changed meanwhile)', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'This dish was changed meanwhile', code: 'PT409' },
    })

    await expect(
      saveDish({ dish: testDish(), baseRevision: 'old', replaceItemIds: [] }),
    ).rejects.toEqual(new ApiError('This dish was changed meanwhile', 'PT409'))
  })
})

describe('deleteDish', () => {
  test('deletes through the RPC', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: null })

    await deleteDish('dish-1')

    expect(supabaseMock.rpc).toHaveBeenCalledWith('delete_dish', { p_dish_id: 'dish-1' })
  })

  test('turns a database error into an ApiError', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: DB_ERROR })

    await expect(deleteDish('dish-1')).rejects.toEqual(new ApiError('permission denied', '42501'))
  })
})
