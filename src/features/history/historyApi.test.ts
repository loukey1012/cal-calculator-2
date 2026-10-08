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
      data: [
        { date: '2026-10-01', kcal: 1850.5, protein: 98.2, meal_count: 3, kcal_estimated: true },
        { date: '2026-10-02', kcal: 900, protein: 40, meal_count: 1, kcal_estimated: null },
      ],
      error: null,
    })
    Object.assign(query, { gte: vi.fn(() => query), lte: vi.fn(() => query) })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(fetchDailyTotals('u1', '2026-10-01', '2026-10-31')).resolves.toEqual([
      { date: '2026-10-01', kcal: 1850.5, protein: 98.2, mealCount: 3, kcalEstimated: true },
      { date: '2026-10-02', kcal: 900, protein: 40, mealCount: 1, kcalEstimated: false },
    ])
    expect(supabaseMock.from).toHaveBeenCalledWith('daily_totals')
    expect(query.select).toHaveBeenCalledWith('date, kcal, protein, meal_count, kcal_estimated')
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
