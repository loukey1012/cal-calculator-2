import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { DayTotal } from '../history/calendar'
import { monthKeys } from '../history/hooks'

vi.mock('../dayMarks/dayMarksApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../dayMarks/dayMarksApi')>()),
  setGymDay: vi.fn(),
}))

vi.mock('./mealsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./mealsApi')>()),
  setDayMark: vi.fn(),
  setCheatMeal: vi.fn(),
}))

import { useSetCheatMeal, useSetDayMark } from './hooks'
import { useSetGymDay } from '../dayMarks/hooks'
import { setCheatMeal, setDayMark } from './mealsApi'
import { setGymDay } from '../dayMarks/dayMarksApi'

const MONTH_KEY = monthKeys.month('u1', '2026-10-01')

function row(date: string, extra: Partial<DayTotal> = {}): DayTotal {
  return {
    date,
    kcal: 1500,
    protein: 80,
    mealCount: 3,
    kcalEstimated: false,
    cheatDay: false,
    cheatMeal: false,
    alcoholDay: false,
    lunchLogged: true,
    dinnerLogged: true,
    ...extra,
  }
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

const totalOf = (queryClient: QueryClient, date: string) =>
  queryClient.getQueryData<DayTotal[]>(MONTH_KEY)?.find((total) => total.date === date)

// a save that stays in flight, so what is read is the optimistic state
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(setDayMark).mockImplementation(() => new Promise(() => {}))
  vi.mocked(setCheatMeal).mockImplementation(() => new Promise(() => {}))
  vi.mocked(setGymDay).mockImplementation(() => new Promise(() => {}))
})

describe('setting a day mark', () => {
  test('shows a cheat day in the cached month totals at once', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(MONTH_KEY, [row('2026-10-05'), row('2026-10-06')])
    const { result } = renderHook(() => useSetDayMark('u1', '2026-10-05'), { wrapper })

    act(() => result.current.mutate('cheat'))

    await waitFor(() => expect(totalOf(queryClient, '2026-10-05')?.cheatDay).toBe(true))
    expect(totalOf(queryClient, '2026-10-06')?.cheatDay).toBe(false)
  })

  test('an alcohol mark replaces a cheat day', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(MONTH_KEY, [row('2026-10-05', { cheatDay: true })])
    const { result } = renderHook(() => useSetDayMark('u1', '2026-10-05'), { wrapper })

    act(() => result.current.mutate('alcohol'))

    await waitFor(() => expect(totalOf(queryClient, '2026-10-05')?.alcoholDay).toBe(true))
    expect(totalOf(queryClient, '2026-10-05')?.cheatDay).toBe(false)
  })

  test('taking the mark back clears both', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(MONTH_KEY, [row('2026-10-05', { alcoholDay: true })])
    const { result } = renderHook(() => useSetDayMark('u1', '2026-10-05'), { wrapper })

    act(() => result.current.mutate(null))

    await waitFor(() => expect(totalOf(queryClient, '2026-10-05')?.alcoholDay).toBe(false))
    expect(totalOf(queryClient, '2026-10-05')?.cheatDay).toBe(false)
  })

  test('a day without a row (no meals) gets one', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(MONTH_KEY, [row('2026-10-06')])
    const { result } = renderHook(() => useSetDayMark('u1', '2026-10-05'), { wrapper })

    act(() => result.current.mutate('cheat'))

    await waitFor(() =>
      expect(totalOf(queryClient, '2026-10-05')).toMatchObject({ cheatDay: true, mealCount: 0 }),
    )
  })

  test('does not make up a month that was never loaded', async () => {
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => useSetDayMark('u1', '2026-10-05'), { wrapper })

    act(() => result.current.mutate('cheat'))

    await waitFor(() => expect(setDayMark).toHaveBeenCalled())
    expect(queryClient.getQueryData(MONTH_KEY)).toBeUndefined()
  })

  test('puts the old totals back when the save fails', async () => {
    const { queryClient, wrapper } = setup()
    vi.mocked(setDayMark).mockRejectedValue(new Error('offline'))
    const before = [row('2026-10-05')]
    queryClient.setQueryData(MONTH_KEY, before)
    const { result } = renderHook(() => useSetDayMark('u1', '2026-10-05'), { wrapper })

    act(() => result.current.mutate('cheat'))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(totalOf(queryClient, '2026-10-05')?.cheatDay).toBe(false)
  })
})

describe('setting a cheat meal', () => {
  const dayKey = ['day', 'u1', '2026-10-05']
  const meal = (mealType: string, cheat: boolean) => ({
    id: mealType,
    meal_type: mealType,
    cheat_meal: cheat,
    note: null,
    meal_items: [],
  })

  test('shows the cheat meal in the cached month totals at once', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(MONTH_KEY, [row('2026-10-05')])
    queryClient.setQueryData(dayKey, [meal('lunch', false)])
    const { result } = renderHook(() => useSetCheatMeal('u1', '2026-10-05'), { wrapper })

    act(() => result.current.mutate({ mealType: 'lunch', cheatMeal: true }))

    await waitFor(() => expect(totalOf(queryClient, '2026-10-05')?.cheatMeal).toBe(true))
  })

  test('taking back the last cheat meal clears it, one of two keeps it', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(MONTH_KEY, [row('2026-10-05', { cheatMeal: true })])
    queryClient.setQueryData(dayKey, [meal('lunch', true), meal('dinner', true)])
    const { result } = renderHook(() => useSetCheatMeal('u1', '2026-10-05'), { wrapper })

    act(() => result.current.mutate({ mealType: 'lunch', cheatMeal: false }))
    await waitFor(() => expect(setCheatMeal).toHaveBeenCalledTimes(1))
    expect(totalOf(queryClient, '2026-10-05')?.cheatMeal).toBe(true)

    act(() => result.current.mutate({ mealType: 'dinner', cheatMeal: false }))
    await waitFor(() => expect(totalOf(queryClient, '2026-10-05')?.cheatMeal).toBe(false))
  })

  test('an unloaded month stays unloaded', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(dayKey, [meal('lunch', false)])
    const { result } = renderHook(() => useSetCheatMeal('u1', '2026-10-05'), { wrapper })

    act(() => result.current.mutate({ mealType: 'lunch', cheatMeal: true }))

    await waitFor(() => expect(setCheatMeal).toHaveBeenCalled())
    expect(queryClient.getQueryData(MONTH_KEY)).toBeUndefined()
  })

  test('taking back a cheat meal on a day that was never opened leaves the cell alone', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(MONTH_KEY, [row('2026-10-05', { cheatMeal: true })])
    const { result } = renderHook(() => useSetCheatMeal('u1', '2026-10-05'), { wrapper })

    act(() => result.current.mutate({ mealType: 'lunch', cheatMeal: false }))

    await waitFor(() => expect(setCheatMeal).toHaveBeenCalled())
    expect(totalOf(queryClient, '2026-10-05')?.cheatMeal).toBe(true)
  })
})

describe('a mirror never blocks the save', () => {
  test('a month cache that is not a list still lets a cheat day be sent', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(MONTH_KEY, { odd: 'shape' })
    const { result } = renderHook(() => useSetDayMark('u1', '2026-10-05'), { wrapper })

    act(() => result.current.mutate('cheat'))

    await waitFor(() => expect(setDayMark).toHaveBeenCalled())
  })

  test('a month cache that is not a list still lets a gym change be sent', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData([...MONTH_KEY, 'gym'], 'garbage')
    const { result } = renderHook(() => useSetGymDay('u1', '2026-10-05'), { wrapper })

    act(() => result.current.mutate(true))

    await waitFor(() => expect(setGymDay).toHaveBeenCalled())
  })
})
