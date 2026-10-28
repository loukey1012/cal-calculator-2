import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fakeQuery } from '../../../test/fakeQuery'

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }))
vi.mock('../../../lib/supabase', () => ({ supabase: supabaseMock }))
vi.mock('../historyApi', () => ({ fetchMonthNotes: vi.fn(), fetchDailyTotals: vi.fn() }))

import { ApiError } from '../../../lib/errors'
import { fetchMonthNotes } from '../historyApi'
import { fetchWeekData } from './weekApi'

type Result = { readonly data: unknown; readonly error: unknown }

/** Routes each table to its own fake query. */
function respond(tables: Record<string, Result>) {
  const queries = Object.fromEntries(
    Object.entries(tables).map(([table, result]) => {
      const query = fakeQuery(result)
      Object.assign(query, {
        eq: vi.fn(() => query),
        gte: vi.fn(() => query),
        lte: vi.fn(() => query),
        select: vi.fn(() => query),
      })
      return [table, query]
    }),
  )
  supabaseMock.from.mockImplementation((table: string) => queries[table])
  return queries
}

const OK = { data: [], error: null }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchMonthNotes).mockResolvedValue([])
})

describe('fetchWeekData', () => {
  test('reads the days with their nutrients, meal calories, foods and notes of the range', async () => {
    const queries = respond({
      daily_totals: {
        data: [
          {
            date: '2026-10-20',
            kcal: 1900,
            protein: 90,
            carbs: 210.5,
            fat: 60,
            fiber: 25,
            meal_count: 3,
            kcal_estimated: false,
            cheat_day: false,
            cheat_meal: false,
            alcohol_day: false,
            lunch_logged: true,
            dinner_logged: true,
          },
          // aggregates of a day with marks but no meals are null
          {
            date: '2026-10-21',
            kcal: null,
            protein: null,
            carbs: null,
            fat: null,
            fiber: null,
            meal_count: 0,
            cheat_day: true,
          },
        ],
        error: null,
      },
      meal_totals: {
        data: [
          { date: '2026-10-20', meal_type: 'lunch', kcal: 700, item_count: 2 },
          { date: '2026-10-20', meal_type: 'snack', kcal: null, item_count: 0 },
        ],
        error: null,
      },
      meals: {
        data: [{ date: '2026-10-20', meal_items: [{ name: 'Oats' }, { name: 'Apple' }] }],
        error: null,
      },
    })
    vi.mocked(fetchMonthNotes).mockResolvedValue([
      { date: '2026-10-20', mealType: null, text: 'Hiked' },
    ])

    const data = await fetchWeekData('u1', '2026-10-19', '2026-10-25')

    expect(data.days[0]).toEqual({
      date: '2026-10-20',
      kcal: 1900,
      protein: 90,
      carbs: 210.5,
      fat: 60,
      fiber: 25,
      mealCount: 3,
      kcalEstimated: false,
      cheatDay: false,
      cheatMeal: false,
      alcoholDay: false,
      lunchLogged: true,
      dinnerLogged: true,
    })
    expect(data.days[1]).toMatchObject({ kcal: 0, carbs: 0, cheatDay: true, lunchLogged: false })
    expect(data.meals).toEqual([{ date: '2026-10-20', mealType: 'lunch', kcal: 700 }])
    expect(data.foods).toEqual([
      { date: '2026-10-20', name: 'Oats' },
      { date: '2026-10-20', name: 'Apple' },
    ])
    expect(data.notes).toEqual([{ date: '2026-10-20', mealType: null, text: 'Hiked' }])
    expect(queries['daily_totals']?.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(queries['daily_totals']?.gte).toHaveBeenCalledWith('date', '2026-10-19')
    expect(queries['meals']?.lte).toHaveBeenCalledWith('date', '2026-10-25')
    expect(fetchMonthNotes).toHaveBeenCalledWith('u1', '2026-10-19', '2026-10-25')
  })

  test.each(['daily_totals', 'meal_totals', 'meals'])(
    'turns an error of %s into ApiError',
    async (table) => {
      respond({
        daily_totals: OK,
        meal_totals: OK,
        meals: OK,
        [table]: { data: null, error: { message: 'x', code: '42501' } },
      })

      await expect(fetchWeekData('u1', '2026-10-19', '2026-10-25')).rejects.toBeInstanceOf(ApiError)
    },
  )
})
