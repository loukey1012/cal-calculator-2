import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeQuery } from '../../test/fakeQuery'

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { ApiError } from '../../lib/errors'
import { fetchDailyTotals, fetchNoteDates } from './historyApi'

beforeEach(() => vi.clearAllMocks())

describe('fetchDailyTotals', () => {
  test('reads the daily totals of one person in a date range', async () => {
    const query = fakeQuery({
      data: [
        {
          date: '2026-10-01',
          kcal: 1850.5,
          protein: 98.2,
          meal_count: 3,
          kcal_estimated: true,
          cheat_day: true,
          cheat_meal: false,
          alcohol_day: true,
          lunch_logged: true,
          dinner_logged: false,
        },
        // a row without the marks reads as neither
        { date: '2026-10-02', kcal: 900, protein: 40, meal_count: 1, kcal_estimated: null },
      ],
      error: null,
    })
    Object.assign(query, { gte: vi.fn(() => query), lte: vi.fn(() => query) })
    supabaseMock.from.mockReturnValueOnce(query)

    await expect(fetchDailyTotals('u1', '2026-10-01', '2026-10-31')).resolves.toEqual([
      {
        date: '2026-10-01',
        kcal: 1850.5,
        protein: 98.2,
        mealCount: 3,
        kcalEstimated: true,
        cheatDay: true,
        cheatMeal: false,
        alcoholDay: true,
        lunchLogged: true,
        dinnerLogged: false,
      },
      {
        date: '2026-10-02',
        kcal: 900,
        protein: 40,
        mealCount: 1,
        kcalEstimated: false,
        cheatDay: false,
        cheatMeal: false,
        alcoholDay: false,
        lunchLogged: false,
        dinnerLogged: false,
      },
    ])
    expect(supabaseMock.from).toHaveBeenCalledWith('daily_totals')
    expect(query.select).toHaveBeenCalledWith(
      'date, kcal, protein, meal_count, kcal_estimated, cheat_day, cheat_meal, alcohol_day, lunch_logged, dinner_logged',
    )
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

describe('fetchNoteDates', () => {
  test('lists the days with a day note or a meal note in the range, once each, in order', async () => {
    const queries = {
      day_notes: fakeQuery({
        data: [{ date: '2026-10-09' }, { date: '2026-10-03' }],
        error: null,
      }),
      meals: fakeQuery({
        data: [
          { date: '2026-10-03', note: 'late' },
          { date: '2026-10-05', note: 'big lunch' },
          { date: '2026-10-06', note: null },
          { date: '2026-10-07', note: '' },
        ],
        error: null,
      }),
    }
    supabaseMock.from.mockImplementation((table: keyof typeof queries) => queries[table])

    await expect(fetchNoteDates('u1', '2026-10-01', '2026-10-31')).resolves.toEqual([
      '2026-10-03',
      '2026-10-05',
      '2026-10-09',
    ])
    expect(queries.day_notes.eq).toHaveBeenCalledWith('user_id', 'u1')
    // the database leaves out the meals without a note
    expect(queries.meals.not).toHaveBeenCalledWith('note', 'is', null)
    expect(queries.meals.gte).toHaveBeenCalledWith('date', '2026-10-01')
    expect(queries.meals.lte).toHaveBeenCalledWith('date', '2026-10-31')
  })

  test('turns database errors into ApiError', async () => {
    const failing = fakeQuery({ data: null, error: { message: 'x', code: '42501' } })
    const fine = fakeQuery({ data: [], error: null })
    supabaseMock.from.mockImplementation((table: string) => (table === 'meals' ? failing : fine))

    await expect(fetchNoteDates('u1', '2026-10-01', '2026-10-31')).rejects.toBeInstanceOf(ApiError)
  })
})
