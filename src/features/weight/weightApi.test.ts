import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeQuery } from '../../test/fakeQuery'

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { ApiError } from '../../lib/errors'
import { deleteWeight, fetchWeights, saveWeight } from './weightApi'

beforeEach(() => vi.clearAllMocks())

describe('weightApi', () => {
  test('fetchWeights loads a person’s weights, oldest first', async () => {
    const query = fakeQuery({
      data: [{ date: '2026-10-01', weight_kg: 72.4 }],
      error: null,
    })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(fetchWeights('u1')).resolves.toEqual([{ date: '2026-10-01', weightKg: 72.4 }])
    expect(supabaseMock.from).toHaveBeenCalledWith('weight_entries')
    expect(query.select).toHaveBeenCalledWith('date, weight_kg')
    expect(query.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(query.order).toHaveBeenCalledWith('date')
  })

  test('saveWeight stores the day’s weight, replacing one saved that day (safe to resend)', async () => {
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await saveWeight('u1', { date: '2026-10-01', weightKg: 72.1 })

    expect(query.upsert).toHaveBeenCalledWith(
      { user_id: 'u1', date: '2026-10-01', weight_kg: 72.1 },
      { onConflict: 'user_id,date' },
    )
  })

  test('deleteWeight removes that day’s entry (deleting again is fine)', async () => {
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await deleteWeight('u1', '2026-10-01')

    expect(query.delete).toHaveBeenCalled()
    expect(query.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(query.eq).toHaveBeenCalledWith('date', '2026-10-01')
  })

  test('database errors become ApiErrors', async () => {
    supabaseMock.from.mockReturnValueOnce(
      fakeQuery({ data: null, error: { message: 'x', code: '42501' } }),
    )

    await expect(saveWeight('u1', { date: '2026-10-01', weightKg: 70 })).rejects.toBeInstanceOf(
      ApiError,
    )
  })
})
