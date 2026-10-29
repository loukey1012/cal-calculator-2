import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeQuery } from '../../test/fakeQuery'

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { ApiError } from '../../lib/errors'
import {
  fetchGymDates,
  fetchGymDay,
  fetchSexDates,
  fetchSexDay,
  setGymDay,
  setSexDay,
} from './dayMarksApi'

const RANGE = ['2026-10-01', '2026-10-31'] as const

beforeEach(() => vi.clearAllMocks())

describe('fetchGymDay / fetchSexDay', () => {
  test('a gym day is there when the person has a row for the date', async () => {
    const query = fakeQuery({ data: { date: '2026-10-02' }, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(fetchGymDay('u1', '2026-10-02')).resolves.toBe(true)

    expect(supabaseMock.from).toHaveBeenCalledWith('gym_days')
    expect(query.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(query.eq).toHaveBeenCalledWith('date', '2026-10-02')
  })

  test('no row is no gym day', async () => {
    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: null, error: null }))
    await expect(fetchGymDay('u1', '2026-10-02')).resolves.toBe(false)
  })

  test('a sex day is asked for by household and date', async () => {
    const query = fakeQuery({ data: { date: '2026-10-02' }, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(fetchSexDay('h1', '2026-10-02')).resolves.toBe(true)

    expect(supabaseMock.from).toHaveBeenCalledWith('sex_days')
    expect(query.eq).toHaveBeenCalledWith('household_id', 'h1')
  })

  test('a failed read throws an ApiError', async () => {
    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: null, error: { message: 'boom' } }))
    await expect(fetchSexDay('h1', '2026-10-02')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('setGymDay / setSexDay', () => {
  test('setting a gym day inserts it, ignoring a row that is already there', async () => {
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await setGymDay('u1', '2026-10-02', true)

    expect(supabaseMock.from).toHaveBeenCalledWith('gym_days')
    expect(query.upsert).toHaveBeenCalledWith(
      { user_id: 'u1', date: '2026-10-02' },
      { onConflict: 'user_id,date', ignoreDuplicates: true },
    )
  })

  test('taking a gym day back deletes the row', async () => {
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await setGymDay('u1', '2026-10-02', false)

    expect(query.delete).toHaveBeenCalled()
    expect(query.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(query.eq).toHaveBeenCalledWith('date', '2026-10-02')
  })

  test('a sex day is one row per household and date', async () => {
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await setSexDay('h1', '2026-10-02', true)

    expect(supabaseMock.from).toHaveBeenCalledWith('sex_days')
    expect(query.upsert).toHaveBeenCalledWith(
      { household_id: 'h1', date: '2026-10-02' },
      { onConflict: 'household_id,date', ignoreDuplicates: true },
    )
  })

  test('taking a sex day back deletes the household row', async () => {
    const query = fakeQuery({ data: null, error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await setSexDay('h1', '2026-10-02', false)

    expect(query.delete).toHaveBeenCalled()
    expect(query.eq).toHaveBeenCalledWith('household_id', 'h1')
  })

  test.each([
    ['gym', () => setGymDay('u1', '2026-10-02', true)],
    ['sex', () => setSexDay('h1', '2026-10-02', false)],
  ])('a rejected %s change throws', async (_name, run) => {
    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: null, error: { message: 'no' } }))
    await expect(run()).rejects.toBeInstanceOf(ApiError)
  })
})

describe('fetchGymDates / fetchSexDates', () => {
  test('the gym dates of a range, as a list of dates', async () => {
    const query = fakeQuery({
      data: [{ date: '2026-10-03' }, { date: '2026-10-09' }],
      error: null,
    })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(fetchGymDates('u1', ...RANGE)).resolves.toEqual(['2026-10-03', '2026-10-09'])

    expect(query.gte).toHaveBeenCalledWith('date', '2026-10-01')
    expect(query.lte).toHaveBeenCalledWith('date', '2026-10-31')
  })

  test('the sex dates of a household in a range', async () => {
    const query = fakeQuery({ data: [{ date: '2026-10-03' }], error: null })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(fetchSexDates('h1', ...RANGE)).resolves.toEqual(['2026-10-03'])
    expect(query.eq).toHaveBeenCalledWith('household_id', 'h1')
  })

  test('a failed read throws an ApiError', async () => {
    supabaseMock.from.mockReturnValueOnce(fakeQuery({ data: null, error: { message: 'boom' } }))
    await expect(fetchGymDates('u1', ...RANGE)).rejects.toBeInstanceOf(ApiError)
  })
})
