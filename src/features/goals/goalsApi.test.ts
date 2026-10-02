import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeQuery } from '../../test/fakeQuery'

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { ApiError } from '../../lib/errors'
import { fetchGoals, saveGoal } from './goalsApi'

const ROW = {
  id: 'g1',
  user_id: 'u1',
  valid_from: '2026-09-01',
  kcal: 2000,
  protein_g: 120,
  carbs_g: null,
  fat_g: null,
  created_at: '',
}

beforeEach(() => vi.clearAllMocks())

describe('goalsApi', () => {
  test('fetchGoals loads a user’s goal history, newest first', async () => {
    const query = fakeQuery({ data: [ROW], error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(fetchGoals('u1')).resolves.toEqual([
      { validFrom: '2026-09-01', kcal: 2000, proteinG: 120, carbsG: null, fatG: null },
    ])
    expect(supabaseMock.from).toHaveBeenCalledWith('goal_history')
    expect(query.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(query.order).toHaveBeenCalledWith('valid_from', { ascending: false })
  })

  test('saveGoal stores a goal valid from a day, replacing one saved earlier that day', async () => {
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await saveGoal('u1', '2026-10-02', { kcal: 1800, proteinG: 140, carbsG: null, fatG: 60 })

    expect(query.upsert).toHaveBeenCalledWith(
      {
        user_id: 'u1',
        valid_from: '2026-10-02',
        kcal: 1800,
        protein_g: 140,
        carbs_g: null,
        fat_g: 60,
      },
      { onConflict: 'user_id,valid_from' },
    )
  })

  test.each([
    ['fetchGoals', () => fetchGoals('u1')],
    [
      'saveGoal',
      () => saveGoal('u1', '2026-10-02', { kcal: 1, proteinG: null, carbsG: null, fatG: null }),
    ],
  ])('%s turns database errors into ApiError', async (_name, call) => {
    supabaseMock.from.mockReturnValueOnce(
      fakeQuery({ data: null, error: { message: 'x', code: '42501' } }),
    )

    await expect(call()).rejects.toBeInstanceOf(ApiError)
  })
})
