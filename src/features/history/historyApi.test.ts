import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeQuery } from '../../test/fakeQuery'

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { ApiError } from '../../lib/errors'
import { fetchDailyTotals } from './historyApi'

beforeEach(() => vi.clearAllMocks())

describe('fetchDailyTotals', () => {
  test('reads the daily totals of one person in a date range', async () => {
    const query = fakeQuery({
      data: [{ date: '2026-10-01', kcal: 1850.5, protein: 98.2, meal_count: 3 }],
      error: null,
    })
    Object.assign(query, { gte: vi.fn(() => query), lte: vi.fn(() => query) })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(fetchDailyTotals('u1', '2026-10-01', '2026-10-31')).resolves.toEqual([
      { date: '2026-10-01', kcal: 1850.5, protein: 98.2, mealCount: 3 },
    ])
    expect(supabaseMock.from).toHaveBeenCalledWith('daily_totals')
    expect(query.eq).toHaveBeenCalledWith('user_id', 'u1')
  })

  test('turns database errors into ApiError', async () => {
    const query = fakeQuery({ data: null, error: { message: 'x', code: '42501' } })
    Object.assign(query, { gte: vi.fn(() => query), lte: vi.fn(() => query) })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(fetchDailyTotals('u1', '2026-10-01', '2026-10-31')).rejects.toBeInstanceOf(
      ApiError,
    )
  })
})
