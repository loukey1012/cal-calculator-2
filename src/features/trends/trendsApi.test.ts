import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeQuery } from '../../test/fakeQuery'

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { ApiError } from '../../lib/errors'
import { fetchNutritionDays } from './trendsApi'

function rangeQuery(result: { data: unknown; error: unknown }) {
  const query = fakeQuery(result)
  return Object.assign(query, { lte: vi.fn(() => query) })
}

beforeEach(() => vi.clearAllMocks())

describe('fetchNutritionDays', () => {
  test('reads one person’s daily totals between two days', async () => {
    const query = rangeQuery({
      data: [
        {
          date: '2026-10-01',
          kcal: 1850.5,
          protein: 98.2,
          carbs: 200,
          fat: 60,
          fiber: null,
          kcal_estimated: true,
          meal_count: 3,
        },
      ],
      error: null,
    })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(fetchNutritionDays('u1', '2026-09-11', '2026-10-08')).resolves.toEqual([
      {
        date: '2026-10-01',
        kcal: 1850.5,
        protein: 98.2,
        carbs: 200,
        fat: 60,
        fiber: 0,
        estimated: true,
        mealCount: 3,
      },
    ])
    expect(supabaseMock.from).toHaveBeenCalledWith('daily_totals')
    expect(query.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(query.gte).toHaveBeenCalledWith('date', '2026-09-11')
    expect(query.lte).toHaveBeenCalledWith('date', '2026-10-08')
  })

  test('database errors become ApiErrors', async () => {
    supabaseMock.from.mockReturnValueOnce(rangeQuery({ data: null, error: { message: 'x' } }))

    await expect(fetchNutritionDays('u1', 'a', 'b')).rejects.toBeInstanceOf(ApiError)
  })
})
