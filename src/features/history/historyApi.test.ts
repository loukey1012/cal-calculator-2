import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeQuery } from '../../test/fakeQuery'

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }))
vi.mock('../../lib/supabase', () => ({ supabase: supabaseMock }))

import { ApiError } from '../../lib/errors'
import { fetchAllNotes, fetchDailyTotals, fetchMonthNotes } from './historyApi'

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

  test('orders by date and reads page after page while a page comes back full', async () => {
    const PAGE = 1000
    const rows = (from: number, count: number) =>
      Array.from({ length: count }, (_, index) => ({
        date: `d${from + index}`,
        kcal: 1,
        protein: 1,
        meal_count: 1,
      }))
    const pages = [rows(0, PAGE), rows(PAGE, PAGE), rows(2 * PAGE, 5)]
    const ranges: Array<readonly [number, number]> = []
    const query = fakeQuery({ data: [], error: null })
    Object.assign(query, {
      gte: vi.fn(() => query),
      lte: vi.fn(() => query),
      range: vi.fn((from: number, to: number) => {
        ranges.push([from, to])
        const page = pages[ranges.length - 1]
        return Promise.resolve({ data: page, error: null })
      }),
    })
    supabaseMock.from.mockReturnValue(query)

    const totals = await fetchDailyTotals('u1', '2020-01-01', '2026-10-27')

    expect(totals).toHaveLength(2 * PAGE + 5)
    expect(totals[0]?.date).toBe('d0')
    expect(totals.at(-1)?.date).toBe(`d${2 * PAGE + 4}`)
    expect(query.order).toHaveBeenCalledWith('date')
    expect(ranges).toEqual([
      [0, PAGE - 1],
      [PAGE, 2 * PAGE - 1],
      [2 * PAGE, 3 * PAGE - 1],
    ])
  })

  test('a later page that fails fails the whole read', async () => {
    const PAGE = 1000
    const full = Array.from({ length: PAGE }, (_, index) => ({ date: `d${index}`, kcal: 1 }))
    const query = fakeQuery({ data: [], error: null })
    Object.assign(query, {
      gte: vi.fn(() => query),
      lte: vi.fn(() => query),
      range: vi
        .fn()
        .mockReturnValueOnce(Promise.resolve({ data: full, error: null }))
        .mockReturnValueOnce(
          Promise.resolve({ data: null, error: { message: 'x', code: '42501' } }),
        ),
    })
    supabaseMock.from.mockReturnValue(query)

    await expect(fetchDailyTotals('u1', '2020-01-01', '2026-10-27')).rejects.toBeInstanceOf(
      ApiError,
    )
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

describe('fetchMonthNotes', () => {
  test('lists the day notes and meal notes in the range, by date, day note first, then meal order', async () => {
    const queries = {
      day_notes: fakeQuery({
        data: [
          { date: '2026-10-09', note: 'Hike' },
          { date: '2026-10-03', note: '  Birthday ' },
          { date: '2026-10-04', note: '   ' },
        ],
        error: null,
      }),
      meals: fakeQuery({
        data: [
          { date: '2026-10-03', meal_type: 'dinner', note: 'late' },
          { date: '2026-10-03', meal_type: 'breakfast', note: 'early' },
          { date: '2026-10-05', meal_type: 'lunch', note: 'big lunch' },
          { date: '2026-10-06', meal_type: 'lunch', note: null },
          { date: '2026-10-07', meal_type: 'lunch', note: '' },
          { date: '2026-10-08', meal_type: 'lunch', note: ' \n ' },
        ],
        error: null,
      }),
    }
    supabaseMock.from.mockImplementation((table: keyof typeof queries) => queries[table])

    await expect(fetchMonthNotes('u1', '2026-10-01', '2026-10-31')).resolves.toEqual([
      { date: '2026-10-03', mealType: null, text: 'Birthday' },
      { date: '2026-10-03', mealType: 'breakfast', text: 'early' },
      { date: '2026-10-03', mealType: 'dinner', text: 'late' },
      { date: '2026-10-05', mealType: 'lunch', text: 'big lunch' },
      { date: '2026-10-09', mealType: null, text: 'Hike' },
    ])
    expect(queries.day_notes.select).toHaveBeenCalledWith('date, note')
    expect(queries.day_notes.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(queries.meals.select).toHaveBeenCalledWith('date, meal_type, note')
    // the database leaves out the meals without a note
    expect(queries.meals.not).toHaveBeenCalledWith('note', 'is', null)
    expect(queries.meals.gte).toHaveBeenCalledWith('date', '2026-10-01')
    expect(queries.meals.lte).toHaveBeenCalledWith('date', '2026-10-31')
  })

  test('turns database errors into ApiError', async () => {
    const failing = fakeQuery({ data: null, error: { message: 'x', code: '42501' } })
    const fine = fakeQuery({ data: [], error: null })
    supabaseMock.from.mockImplementation((table: string) => (table === 'meals' ? failing : fine))

    await expect(fetchMonthNotes('u1', '2026-10-01', '2026-10-31')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('fetchAllNotes', () => {
  test('lists every note of the person without a date range, newest day first', async () => {
    const queries = {
      day_notes: fakeQuery({
        data: [
          { date: '2026-09-03', note: ' Birthday ' },
          { date: '2026-10-09', note: 'Hike' },
          { date: '2026-10-10', note: '  ' },
        ],
        error: null,
      }),
      meals: fakeQuery({
        data: [
          { date: '2026-10-09', meal_type: 'dinner', note: 'late' },
          { date: '2026-10-09', meal_type: 'breakfast', note: 'early' },
          { date: '2026-08-01', meal_type: 'lunch', note: 'big lunch' },
          { date: '2026-08-02', meal_type: 'lunch', note: null },
        ],
        error: null,
      }),
    }
    supabaseMock.from.mockImplementation((table: keyof typeof queries) => queries[table])

    await expect(fetchAllNotes('u1')).resolves.toEqual([
      { date: '2026-10-09', mealType: null, text: 'Hike' },
      { date: '2026-10-09', mealType: 'breakfast', text: 'early' },
      { date: '2026-10-09', mealType: 'dinner', text: 'late' },
      { date: '2026-09-03', mealType: null, text: 'Birthday' },
      { date: '2026-08-01', mealType: 'lunch', text: 'big lunch' },
    ])
    expect(queries.day_notes.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(queries.meals.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(queries.meals.not).toHaveBeenCalledWith('note', 'is', null)
    expect(queries.day_notes.gte).not.toHaveBeenCalled()
    expect(queries.meals.lte).not.toHaveBeenCalled()
    // a cut at the row cap must lose the oldest notes, not an arbitrary part
    expect(queries.day_notes.order).toHaveBeenCalledWith('date', { ascending: false })
    expect(queries.meals.order).toHaveBeenCalledWith('date', { ascending: false })
  })

  test('turns database errors into ApiError', async () => {
    const failing = fakeQuery({ data: null, error: { message: 'x', code: '42501' } })
    const fine = fakeQuery({ data: [], error: null })
    supabaseMock.from.mockImplementation((table: string) =>
      table === 'day_notes' ? failing : fine,
    )

    await expect(fetchAllNotes('u1')).rejects.toBeInstanceOf(ApiError)
  })
})
