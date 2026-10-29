import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeQuery } from '../../test/fakeQuery'

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { ApiError } from '../../lib/errors'
import { fetchExportData } from './exportApi'

const PEOPLE = [
  { id: 'u1', name: 'Lukas' },
  { id: 'u2', name: 'Anna' },
]

beforeEach(() => vi.clearAllMocks())

describe('fetchExportData', () => {
  test('loads both people’s meals, day totals and weights of the chosen days', async () => {
    const meals = fakeQuery({
      data: [
        {
          user_id: 'u1',
          date: '2026-10-02',
          meal_type: 'lunch',
          meal_items: [
            { name: 'Stew', kcal: 100, dish_portions: { dishes: { kcal_estimated: true } } },
            { name: 'Apple', kcal: 52, dish_portions: null },
          ],
        },
      ],
      error: null,
    })
    const days = fakeQuery({
      data: [{ user_id: 'u1', date: '2026-10-02', kcal: 152 }],
      error: null,
    })
    const weights = fakeQuery({ data: [], error: null })
    const gymDays = fakeQuery({ data: [{ user_id: 'u1', date: '2026-10-03' }], error: null })
    const sexDays = fakeQuery({ data: [{ date: '2026-10-04' }], error: null })
    supabaseMock.from
      .mockReturnValueOnce(meals)
      .mockReturnValueOnce(days)
      .mockReturnValueOnce(weights)
      .mockReturnValueOnce(gymDays)
      .mockReturnValueOnce(sexDays)

    const data = await fetchExportData(PEOPLE, '2026-10-01', '2026-10-31')

    expect(supabaseMock.from.mock.calls.map(([table]) => table)).toEqual([
      'meals',
      'daily_totals',
      'weight_entries',
      'gym_days',
      'sex_days',
    ])
    for (const query of [meals, days, weights, gymDays, sexDays]) {
      if (query !== sexDays) expect(query.in).toHaveBeenCalledWith('user_id', ['u1', 'u2'])
      expect(query.gte).toHaveBeenCalledWith('date', '2026-10-01')
      expect(query.lte).toHaveBeenCalledWith('date', '2026-10-31')
    }
    expect(data.people).toEqual(PEOPLE)
    expect(data.meals[0]?.meal_items).toEqual([
      expect.objectContaining({ name: 'Stew', estimated: true }),
      expect.objectContaining({ name: 'Apple', estimated: false }),
    ])
    expect(data.days).toHaveLength(1)
    expect(data.gymDays).toEqual([{ user_id: 'u1', date: '2026-10-03' }])
    expect(data.sexDays).toEqual([{ date: '2026-10-04' }])
  })

  test('a failed load becomes an ApiError', async () => {
    supabaseMock.from.mockReturnValue(
      fakeQuery({ data: null, error: { message: 'offline', code: 'PGRST000' } }),
    )

    await expect(fetchExportData(PEOPLE, '2026-10-01', '2026-10-31')).rejects.toBeInstanceOf(
      ApiError,
    )
  })

  test('a long range is loaded page by page, so no row is cut off', async () => {
    const page = (count: number, start = 0) =>
      Array.from({ length: count }, (_, index) => ({
        user_id: 'u1',
        date: `2026-01-01`,
        weight_kg: 70 + (start + index) / 1000,
      }))
    const empty = () => fakeQuery({ data: [], error: null })
    const firstWeights = fakeQuery({ data: page(1000), error: null })
    const secondWeights = fakeQuery({ data: page(5, 1000), error: null })
    supabaseMock.from.mockImplementation((table: string) => {
      if (table !== 'weight_entries') return empty()
      return firstWeights.range.mock.calls.length === 0 ? firstWeights : secondWeights
    })

    const data = await fetchExportData(PEOPLE, '2024-01-01', '2026-10-31')

    expect(data.weights).toHaveLength(1005)
    expect(firstWeights.range).toHaveBeenCalledWith(0, 999)
    expect(secondWeights.range).toHaveBeenCalledWith(1000, 1999)
  })
})
