import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('./dayMarksApi', () => ({
  fetchGymDay: vi.fn(),
  fetchSexDay: vi.fn(),
  fetchGymDates: vi.fn(),
  fetchSexDates: vi.fn(),
  setGymDay: vi.fn(),
  setSexDay: vi.fn(),
}))
vi.mock('../meals/mealsApi', () => ({
  fetchDay: vi.fn(),
  fetchDayMark: vi.fn(),
  fetchDayNote: vi.fn(),
  setDayMark: vi.fn(),
  setCheatMeal: vi.fn(),
}))

import { setGymDay, fetchGymDay, fetchSexDay, setSexDay } from './dayMarksApi'
import { fetchDay, fetchDayMark, setCheatMeal, setDayMark } from '../meals/mealsApi'
import type { DayMeal } from '../meals/dayModel'
import { PENDING_MS, useDayFlags } from './useDayFlags'

function setup(options: { householdId?: string | null; userId?: string } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const householdId = options.householdId === undefined ? 'h1' : options.householdId
  const hook = renderHook(
    ({ date }: { date: string }) =>
      useDayFlags({
        userId: options.userId ?? 'u1',
        householdId,
        date,
      }),
    { wrapper, initialProps: { date: DAY } },
  )
  return { ...hook, queryClient }
}

const DAY = '2026-10-05'
const OTHER_DAY = '2026-10-06'

const lunch = (cheat: boolean): DayMeal =>
  ({ id: 'm1', meal_type: 'lunch', meal_items: [], cheat_meal: cheat }) as unknown as DayMeal

beforeEach(() => {
  vi.clearAllMocks()
  // a tiny fake server: saves resolve and later reads return what was saved
  const server = { mark: null as 'cheat' | 'alcohol' | null, gym: false, sex: false, cheat: false }
  vi.mocked(fetchDayMark).mockImplementation(async () => server.mark)
  vi.mocked(fetchDay).mockImplementation(async () => [lunch(server.cheat)])
  vi.mocked(fetchGymDay).mockImplementation(async () => server.gym)
  vi.mocked(fetchSexDay).mockImplementation(async () => server.sex)
  vi.mocked(setDayMark).mockImplementation(async (_user, _date, mark) => {
    server.mark = mark
  })
  vi.mocked(setCheatMeal).mockImplementation(async ({ cheatMeal }) => {
    server.cheat = cheatMeal
  })
  vi.mocked(setGymDay).mockImplementation(async (_user, _date, on) => {
    server.gym = on
  })
  vi.mocked(setSexDay).mockImplementation(async (_household, _date, on) => {
    server.sex = on
  })
})

async function loaded(result: { current: ReturnType<typeof useDayFlags> }) {
  await waitFor(() => {
    expect(result.current.dayMarkLoaded).toBe(true)
    expect(result.current.cheatMealsLoaded).toBe(true)
    expect(result.current.gymLoaded).toBe(true)
  })
}

describe('useDayFlags', () => {
  test('cheat day then alcohol saves cheat, then alcohol (it replaces the cheat day)', async () => {
    const { result } = setup()
    await loaded(result)

    act(() => result.current.toggle('cheatDay'))
    act(() => result.current.toggle('alcohol'))

    await waitFor(() => expect(vi.mocked(setDayMark)).toHaveBeenCalledTimes(2))
    expect(vi.mocked(setDayMark).mock.calls.map((call) => call[2])).toEqual(['cheat', 'alcohol'])
  })

  test('two taps in the same tick act on the latest value, not a stale one', async () => {
    const { result } = setup()
    await loaded(result)

    act(() => {
      result.current.toggle('gym')
      result.current.toggle('gym')
    })

    await waitFor(() => expect(vi.mocked(setGymDay)).toHaveBeenCalledTimes(2))
    expect(vi.mocked(setGymDay).mock.calls.map((call) => call[2])).toEqual([true, false])
  })

  test('a second tap on cheat day takes it back', async () => {
    const { result } = setup()
    await loaded(result)

    act(() => {
      result.current.toggle('cheatDay')
      result.current.toggle('cheatDay')
    })

    await waitFor(() => expect(vi.mocked(setDayMark)).toHaveBeenCalledTimes(2))
    expect(vi.mocked(setDayMark).mock.calls.map((call) => call[2])).toEqual(['cheat', null])
  })

  test('sex toggles with a household', async () => {
    const { result } = setup()
    await waitFor(() => expect(result.current.sexLoaded).toBe(true))

    act(() => result.current.toggle('sex'))

    await waitFor(() => expect(result.current.sex).toBe(true))
    expect(vi.mocked(setSexDay).mock.calls.map((call) => call[2])).toEqual([true])
  })

  test('cheat meal toggle saves that meal, a second tap takes it back', async () => {
    const { result } = setup()
    await loaded(result)

    act(() => result.current.toggleCheatMeal('lunch'))
    await waitFor(() => expect(result.current.cheatMeals.has('lunch')).toBe(true))
    act(() => result.current.toggleCheatMeal('lunch'))

    await waitFor(() => expect(vi.mocked(setCheatMeal)).toHaveBeenCalledTimes(2))
    expect(vi.mocked(setCheatMeal).mock.calls.map((call) => call[0].cheatMeal)).toEqual([
      true,
      false,
    ])
  })

  test('taps before the data has loaded do nothing', () => {
    vi.mocked(fetchDayMark).mockImplementation(() => new Promise(() => {}))
    vi.mocked(fetchDay).mockImplementation(() => new Promise(() => {}))
    vi.mocked(fetchGymDay).mockImplementation(() => new Promise(() => {}))
    vi.mocked(fetchSexDay).mockImplementation(() => new Promise(() => {}))
    const { result } = setup()

    act(() => {
      result.current.toggle('cheatDay')
      result.current.toggle('alcohol')
      result.current.toggle('gym')
      result.current.toggle('sex')
      result.current.toggleCheatMeal('lunch')
    })

    expect(setDayMark).not.toHaveBeenCalled()
    expect(setGymDay).not.toHaveBeenCalled()
    expect(setSexDay).not.toHaveBeenCalled()
    expect(setCheatMeal).not.toHaveBeenCalled()
  })

  test('without a household sex is null and toggling it does nothing', async () => {
    const { result } = setup({ householdId: null })
    await loaded(result)

    act(() => result.current.toggle('sex'))

    expect(result.current.sex).toBeNull()
    expect(result.current.sexLoaded).toBe(false)
    expect(setSexDay).not.toHaveBeenCalled()
  })

  test('on the partner’s day every save goes to the partner’s user id', async () => {
    const { result } = setup({ userId: 'u2' })
    await loaded(result)
    await waitFor(() => expect(result.current.sexLoaded).toBe(true))

    act(() => result.current.toggle('gym'))
    act(() => result.current.toggle('sex'))
    act(() => result.current.toggle('cheatDay'))
    act(() => result.current.toggleCheatMeal('lunch'))

    await waitFor(() => expect(vi.mocked(setCheatMeal)).toHaveBeenCalledTimes(1))
    expect(vi.mocked(setGymDay).mock.calls[0]).toEqual(['u2', DAY, true])
    expect(vi.mocked(setSexDay).mock.calls[0]?.[1]).toBe(DAY)
    expect(vi.mocked(setSexDay).mock.calls[0]?.[2]).toBe(true)
    expect(vi.mocked(setDayMark).mock.calls[0]).toEqual(['u2', DAY, 'cheat'])
    expect(vi.mocked(setCheatMeal).mock.calls[0]?.[0]).toMatchObject({
      userId: 'u2',
      date: DAY,
      mealType: 'lunch',
      cheatMeal: true,
    })
  })

  describe('the just-tapped values', () => {
    afterEach(() => vi.restoreAllMocks())

    test('a tap on another day is not decided by the previous day’s tapped value', async () => {
      let savedOnDay = false
      vi.mocked(fetchGymDay).mockImplementation(async (_user, date) =>
        date === OTHER_DAY ? true : savedOnDay,
      )
      vi.mocked(setGymDay).mockImplementation(async (_user, date, on) => {
        if (date === DAY) savedOnDay = on
      })
      const { result, rerender } = setup()
      await loaded(result)
      act(() => result.current.toggle('gym'))
      await waitFor(() => expect(result.current.gym).toBe(true))

      rerender({ date: OTHER_DAY })
      await waitFor(() => expect(result.current.gym).toBe(true))
      act(() => result.current.toggle('gym'))

      await waitFor(() => expect(vi.mocked(setGymDay)).toHaveBeenCalledTimes(2))
      expect(vi.mocked(setGymDay).mock.calls.map((call) => [call[1], call[2]])).toEqual([
        [DAY, true],
        [OTHER_DAY, false],
      ])
    })

    test('three spaced taps alternate, each reading the cache that caught up', async () => {
      const { result } = setup()
      await loaded(result)

      act(() => result.current.toggle('gym'))
      await waitFor(() => expect(result.current.gym).toBe(true))
      act(() => result.current.toggle('gym'))
      await waitFor(() => expect(result.current.gym).toBe(false))
      act(() => result.current.toggle('gym'))
      await waitFor(() => expect(result.current.gym).toBe(true))

      await waitFor(() => expect(vi.mocked(setGymDay)).toHaveBeenCalledTimes(3))
      expect(vi.mocked(setGymDay).mock.calls.map((call) => call[2])).toEqual([true, false, true])
    })

    test('after a failed save the next tap reads the rolled-back cache', async () => {
      vi.mocked(setGymDay).mockRejectedValueOnce(new Error('boom'))
      const { result } = setup()
      await loaded(result)

      act(() => result.current.toggle('gym'))
      await waitFor(() => expect(vi.mocked(setGymDay)).toHaveBeenCalledTimes(1))
      await waitFor(() => expect(result.current.gym).toBe(false))
      // the tapped value is only trusted for a moment
      const later = Date.now() + PENDING_MS + 1
      vi.spyOn(Date, 'now').mockReturnValue(later)
      act(() => result.current.toggle('gym'))

      await waitFor(() => expect(vi.mocked(setGymDay)).toHaveBeenCalledTimes(2))
      expect(vi.mocked(setGymDay).mock.calls.map((call) => call[2])).toEqual([true, true])
    })

    test('a refetch of the day does not break a pending cheat meal tap', async () => {
      let release: () => void = () => {}
      vi.mocked(setCheatMeal).mockImplementationOnce(
        () => new Promise<void>((resolve) => (release = resolve)),
      )
      const { result, queryClient } = setup()
      await loaded(result)

      act(() => result.current.toggleCheatMeal('lunch'))
      // the server hasn't saved yet, so the refetch brings the old day back
      await act(() => queryClient.refetchQueries())
      act(() => result.current.toggleCheatMeal('lunch'))
      release()

      await waitFor(() => expect(vi.mocked(setCheatMeal)).toHaveBeenCalledTimes(2))
      expect(vi.mocked(setCheatMeal).mock.calls.map((call) => call[0].cheatMeal)).toEqual([
        true,
        false,
      ])
    })
  })
})
