import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('./dayMarksApi', () => ({
  fetchGymDay: vi.fn(),
  fetchSexDay: vi.fn(),
  fetchGymDates: vi.fn(),
  fetchSexDates: vi.fn(),
  setGymDay: vi.fn(),
  setSexDay: vi.fn(),
}))

import { setGymDay, setSexDay } from './dayMarksApi'
import { useSetGymDay, useSetSexDay, useSexDay } from './hooks'
import { householdMarkKeys } from './keys'

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

// a save that stays in flight, so what is read is the optimistic state
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(setSexDay).mockImplementation(() => new Promise(() => {}))
  vi.mocked(setGymDay).mockImplementation(() => new Promise(() => {}))
})

describe('setting a sex day', () => {
  test('shows it in the cached month and year at once, before the queue drains', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(householdMarkKeys.month('h1', '2026-10-01'), ['2026-10-02'])
    queryClient.setQueryData(householdMarkKeys.year('h1', 2026), ['2026-10-02'])
    queryClient.setQueryData(householdMarkKeys.month('h1', '2026-09-01'), [])
    const { result } = renderHook(() => useSetSexDay('h1', '2026-10-05', 'u1'), { wrapper })

    act(() => result.current?.mutate(true))

    await waitFor(() =>
      expect(queryClient.getQueryData(householdMarkKeys.month('h1', '2026-10-01'))).toEqual([
        '2026-10-02',
        '2026-10-05',
      ]),
    )
    expect(queryClient.getQueryData(householdMarkKeys.year('h1', 2026))).toEqual([
      '2026-10-02',
      '2026-10-05',
    ])
    expect(queryClient.getQueryData(householdMarkKeys.month('h1', '2026-09-01'))).toEqual([])
  })

  test('taking it back removes the date from the cached month and year', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(householdMarkKeys.month('h1', '2026-10-01'), ['2026-10-05'])
    queryClient.setQueryData(householdMarkKeys.year('h1', 2026), ['2026-10-05'])
    const { result } = renderHook(() => useSetSexDay('h1', '2026-10-05', 'u1'), { wrapper })

    act(() => result.current?.mutate(false))

    await waitFor(() =>
      expect(queryClient.getQueryData(householdMarkKeys.month('h1', '2026-10-01'))).toEqual([]),
    )
    expect(queryClient.getQueryData(householdMarkKeys.year('h1', 2026))).toEqual([])
  })

  test('does not make up a month that was never loaded', async () => {
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => useSetSexDay('h1', '2026-10-05', 'u1'), { wrapper })

    act(() => result.current?.mutate(true))

    await waitFor(() =>
      expect(queryClient.getQueryData(householdMarkKeys.day('h1', '2026-10-05'))).toBe(true),
    )
    expect(queryClient.getQueryData(householdMarkKeys.month('h1', '2026-10-01'))).toBeUndefined()
  })

  test('is not available without a household, so nothing can be silently dropped', () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useSetSexDay(null, '2026-10-05', 'u1'), { wrapper })

    expect(result.current).toBeNull()
    expect(setSexDay).not.toHaveBeenCalled()
  })
})

describe('setting a gym day', () => {
  test('shows it in the cached month and year at once', async () => {
    const { queryClient, wrapper } = setup()
    const monthKey = ['month', 'u1', '2026-10-01', 'gym']
    const yearKey = ['month', 'u1', 'gym-year', 2026]
    queryClient.setQueryData(monthKey, [])
    queryClient.setQueryData(yearKey, [])
    const { result } = renderHook(() => useSetGymDay('u1', '2026-10-05'), { wrapper })

    act(() => result.current.mutate(true))

    await waitFor(() => expect(queryClient.getQueryData(monthKey)).toEqual(['2026-10-05']))
    expect(queryClient.getQueryData(yearKey)).toEqual(['2026-10-05'])
  })
})

describe('a household mark query without a household', () => {
  test('never fetches', () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useSexDay(null, '2026-10-05'), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
  })
})
