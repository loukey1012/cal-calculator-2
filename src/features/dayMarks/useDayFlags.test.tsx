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
import { PENDING_MS, useDayFlags, type FlagToast } from './useDayFlags'

function setup(
  options: { householdId?: string | null; partnerName?: string | null; userId?: string } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const toasts: FlagToast[] = []
  const onChanged = (toast: FlagToast) => toasts.push(toast)
  const householdId = options.householdId === undefined ? 'h1' : options.householdId
  const hook = renderHook(
    ({ date }: { date: string }) =>
      useDayFlags({
        userId: options.userId ?? 'u1',
        householdId,
        date,
        partnerName: options.partnerName ?? null,
        onChanged,
      }),
    { wrapper, initialProps: { date: DAY } },
  )
  return { ...hook, toasts, queryClient }
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
  test('cheat day then alcohol saves one dayMark change to alcohol, and Undo restores cheat', async () => {
    const { result, toasts } = setup()
    await loaded(result)

    act(() => result.current.toggle('cheatDay'))
    act(() => result.current.toggle('alcohol'))

    expect(toasts.map((toast) => toast.message)).toEqual(['Cheat day set', 'Alcohol day set'])
    await waitFor(() => expect(vi.mocked(setDayMark)).toHaveBeenCalledTimes(2))
    expect(vi.mocked(setDayMark).mock.calls.map((call) => call[2])).toEqual(['cheat', 'alcohol'])

    act(() => toasts[1]?.undo())
    await waitFor(() => expect(vi.mocked(setDayMark)).toHaveBeenCalledTimes(3))
    expect(vi.mocked(setDayMark).mock.calls[2]?.[2]).toBe('cheat')
  })

  test('two taps in the same tick act on the latest value, not a stale one', async () => {
    const { result, toasts } = setup()
    await loaded(result)

    act(() => {
      result.current.toggle('gym')
      result.current.toggle('gym')
    })

    expect(toasts.map((toast) => toast.message)).toEqual(['Gym set', 'Gym removed'])
    await waitFor(() => expect(vi.mocked(setGymDay)).toHaveBeenCalledTimes(2))
    expect(vi.mocked(setGymDay).mock.calls.map((call) => call[2])).toEqual([true, false])
  })

  test('gym on, then Undo sends off', async () => {
    const { result, toasts } = setup()
    await loaded(result)

    act(() => result.current.toggle('gym'))
    await waitFor(() => expect(result.current.gym).toBe(true))
    act(() => toasts[0]?.undo())

    await waitFor(() => expect(vi.mocked(setGymDay)).toHaveBeenCalledTimes(2))
    expect(vi.mocked(setGymDay).mock.calls.map((call) => call[2])).toEqual([true, false])
  })

  test('sex toggles with a household and Undo restores it', async () => {
    const { result, toasts } = setup()
    await waitFor(() => expect(result.current.sexLoaded).toBe(true))

    act(() => result.current.toggle('sex'))

    expect(toasts[0]?.message).toBe('Sex set')
    await waitFor(() => expect(result.current.sex).toBe(true))
    act(() => toasts[0]?.undo())
    await waitFor(() => expect(vi.mocked(setSexDay)).toHaveBeenCalledTimes(2))
    expect(vi.mocked(setSexDay).mock.calls.map((call) => call[2])).toEqual([true, false])
    await waitFor(() => expect(result.current.sex).toBe(false))
  })

  test('cheat meal toggle reports its meal and Undo takes it back', async () => {
    const { result, toasts } = setup()
    await loaded(result)

    act(() => result.current.toggleCheatMeal('lunch'))
    await waitFor(() => expect(result.current.cheatMeals.has('lunch')).toBe(true))
    expect(toasts[0]?.message).toBe('Lunch marked as a cheat meal')

    act(() => toasts[0]?.undo())
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
    const { result, toasts } = setup()

    act(() => {
      result.current.toggle('cheatDay')
      result.current.toggle('alcohol')
      result.current.toggle('gym')
      result.current.toggle('sex')
      result.current.toggleCheatMeal('lunch')
    })

    expect(toasts).toEqual([])
    expect(setDayMark).not.toHaveBeenCalled()
    expect(setGymDay).not.toHaveBeenCalled()
    expect(setSexDay).not.toHaveBeenCalled()
    expect(setCheatMeal).not.toHaveBeenCalled()
  })

  test('without a household sex is null and toggling it does nothing', async () => {
    const { result, toasts } = setup({ householdId: null })
    await loaded(result)

    act(() => result.current.toggle('sex'))

    expect(result.current.sex).toBeNull()
    expect(result.current.sexLoaded).toBe(false)
    expect(toasts).toEqual([])
    expect(setSexDay).not.toHaveBeenCalled()
  })

  test('on the partner’s day every save goes to the partner’s user id', async () => {
    const { result, toasts } = setup({ userId: 'u2', partnerName: 'baby' })
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
    expect(toasts).toHaveLength(4)
  })

  test('the partner’s name ends the message', async () => {
    const { result, toasts } = setup({ partnerName: 'baby' })
    await loaded(result)

    act(() => result.current.toggle('gym'))
    act(() => result.current.toggleCheatMeal('lunch'))

    expect(toasts.map((toast) => toast.message)).toEqual([
      'Gym set for baby',
      'Lunch marked as a cheat meal for baby',
    ])
  })

  describe('the just-tapped values', () => {
    afterEach(() => vi.restoreAllMocks())

    test('an Undo written after switching day does not decide the new day’s next tap', async () => {
      let savedOnDay = false
      vi.mocked(fetchGymDay).mockImplementation(async (_user, date) =>
        date === OTHER_DAY ? true : savedOnDay,
      )
      vi.mocked(setGymDay).mockImplementation(async (_user, date, on) => {
        if (date === DAY) savedOnDay = on
      })
      const { result, rerender, toasts } = setup()
      await loaded(result)
      act(() => result.current.toggle('gym'))
      await waitFor(() => expect(result.current.gym).toBe(true))

      rerender({ date: OTHER_DAY })
      await waitFor(() => expect(result.current.gym).toBe(true))
      act(() => toasts[0]?.undo())
      act(() => result.current.toggle('gym'))

      await waitFor(() => expect(vi.mocked(setGymDay)).toHaveBeenCalledTimes(3))
      expect(vi.mocked(setGymDay).mock.calls.map((call) => [call[1], call[2]])).toEqual([
        [DAY, true],
        [DAY, false],
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
