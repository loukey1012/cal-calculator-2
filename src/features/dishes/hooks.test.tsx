import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('./dishesApi', () => ({ saveDish: vi.fn(), deleteDish: vi.fn(), fetchDish: vi.fn() }))
vi.mock('../meals/mealsApi', () => ({
  fetchDay: vi.fn(),
  addMealItem: vi.fn(),
  updateMealItem: vi.fn(),
  deleteMealItem: vi.fn(),
}))

import { ApiError, toUserMessage } from '../../lib/errors'
import type { DayMeal } from '../meals/dayModel'
import { useUpdateMealItem } from '../meals/hooks'
import { updateMealItem } from '../meals/mealsApi'
import { dayMeal, mealItem } from '../meals/testData'
import { deleteDish, fetchDish, saveDish } from './dishesApi'
import { useDeleteDish, useDish, useSaveDish } from './hooks'
import { DAY, sharedLine, testDish } from './testData'

const MY_DAY_KEY = ['day', 'me', DAY]
const HER_DAY_KEY = ['day', 'her', DAY]
const DISH_KEY = ['dish', 'dish-1']

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { readonly children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

function namesIn(queryClient: QueryClient, key: readonly string[]) {
  return (queryClient.getQueryData<DayMeal[]>(key) ?? []).flatMap((meal) =>
    meal.meal_items.map((item) => item.name),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(saveDish).mockResolvedValue()
  vi.mocked(deleteDish).mockResolvedValue()
})

afterEach(() => {
  act(() => onlineManager.setOnline(true))
})

describe('useDish', () => {
  test('loads a dish by id', async () => {
    vi.mocked(fetchDish).mockResolvedValueOnce(testDish())
    const { wrapper } = setup()

    const { result } = renderHook(() => useDish('dish-1'), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(testDish()))
    expect(fetchDish).toHaveBeenCalledWith('dish-1')
  })
})

describe('useSaveDish', () => {
  test('offline, a cooked meal shows right away and is sent once back online', async () => {
    // Arrange
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(MY_DAY_KEY, [])
    const { result } = renderHook(() => useSaveDish(), { wrapper })

    // Act
    act(() => onlineManager.setOnline(false))
    act(() => result.current.save({ dish: testDish() }))

    // Assert
    await waitFor(() => expect(namesIn(queryClient, MY_DAY_KEY)).toEqual(['Mince']))
    expect(saveDish).not.toHaveBeenCalled()
    act(() => onlineManager.setOnline(true))
    await waitFor(() => expect(saveDish).toHaveBeenCalledTimes(1))
  })

  test('a dropped connection is retried with the same dish and revision', async () => {
    vi.mocked(saveDish).mockRejectedValueOnce(new TypeError('Load failed')).mockResolvedValueOnce()
    const { wrapper } = setup()
    const { result } = renderHook(() => useSaveDish(), { wrapper })

    act(() => result.current.save({ dish: testDish() }))

    await waitFor(() => expect(saveDish).toHaveBeenCalledTimes(2), { timeout: 4000 })
    const [first, second] = vi.mocked(saveDish).mock.calls
    expect(second?.[0].dish).toEqual(first?.[0].dish)
  })

  test('shows the portions in both people’s days at once and saves on top of the cached revision', async () => {
    // Arrange
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(MY_DAY_KEY, [dayMeal('m1', 'lunch', [mealItem({ name: 'Apple' })])])
    queryClient.setQueryData(HER_DAY_KEY, [])
    queryClient.setQueryData(DISH_KEY, testDish())
    vi.mocked(saveDish).mockReturnValueOnce(new Promise(() => {}))
    const { result } = renderHook(() => useSaveDish(), { wrapper })
    const edited = testDish({ lines: [sharedLine('l-mince', 'Mince', 600, 250)] })

    // Act
    act(() => result.current.save({ dish: edited }))

    // Assert
    await waitFor(() => expect(namesIn(queryClient, HER_DAY_KEY)).toEqual(['Mince']))
    expect(namesIn(queryClient, MY_DAY_KEY)).toEqual(['Apple', 'Mince'])
    const sent = vi.mocked(saveDish).mock.calls[0]?.[0]
    expect(sent?.baseRevision).toBe('rev-1')
    expect(sent?.dish.revision).not.toBe('rev-1')
    expect(queryClient.getQueryData(DISH_KEY)).toEqual(sent?.dish)
  })

  test('a new dish is saved without a base revision', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useSaveDish(), { wrapper })

    act(() => result.current.save({ dish: testDish() }))

    await waitFor(() => expect(saveDish).toHaveBeenCalledTimes(1))
    expect(vi.mocked(saveDish).mock.calls[0]?.[0].baseRevision).toBeNull()
  })

  test('an invalid dish is refused before anything is queued', () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useSaveDish(), { wrapper })
    const badSplit = testDish({ splitMode: 'percent' })

    expect(() => result.current.save({ dish: badSplit })).toThrow(RangeError)
    expect(saveDish).not.toHaveBeenCalled()
  })

  test('a save the server rejects (changed meanwhile) restores both days and the dish', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(MY_DAY_KEY, [])
    queryClient.setQueryData(HER_DAY_KEY, [])
    queryClient.setQueryData(DISH_KEY, testDish())
    const conflict = new ApiError('This dish was changed meanwhile', 'PT409')
    vi.mocked(saveDish).mockRejectedValueOnce(conflict)
    vi.mocked(fetchDish).mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useSaveDish(), { wrapper })

    act(() => result.current.save({ dish: testDish({ name: 'Renamed' }) }))

    await waitFor(() => expect(result.current.error).toBe(conflict))
    expect(namesIn(queryClient, MY_DAY_KEY)).toEqual([])
    expect(namesIn(queryClient, HER_DAY_KEY)).toEqual([])
    expect(queryClient.getQueryData(DISH_KEY)).toEqual(testDish())
    expect(toUserMessage(conflict)).toMatch(/changed .*meanwhile/i)
  })

  test('once saved, the dish and both days are loaded again from the server', async () => {
    const { queryClient, wrapper } = setup()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useSaveDish(), { wrapper })

    act(() => result.current.save({ dish: testDish() }))

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: DISH_KEY }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: MY_DAY_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: HER_DAY_KEY })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['month', 'me'] })
  })
})

describe('useDeleteDish', () => {
  test('removes the portions from both days at once and deletes the dish', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(DISH_KEY, testDish())
    queryClient.setQueryData(MY_DAY_KEY, [
      dayMeal('m1', 'lunch', [
        mealItem({ id: 'apple', name: 'Apple' }),
        mealItem({ id: 'x', name: 'Mince', dish_portion_id: 'p-me', dish_line_id: 'l-mince' }),
      ]),
    ])
    queryClient.setQueryData(HER_DAY_KEY, [
      dayMeal('m2', 'lunch', [
        mealItem({ id: 'y', name: 'Mince', dish_portion_id: 'p-her', dish_line_id: 'l-mince' }),
      ]),
    ])
    vi.mocked(deleteDish).mockReturnValueOnce(new Promise(() => {}))
    const { result } = renderHook(() => useDeleteDish(), { wrapper })

    act(() => result.current.remove('dish-1'))

    await waitFor(() => expect(deleteDish).toHaveBeenCalledWith('dish-1'))
    expect(namesIn(queryClient, MY_DAY_KEY)).toEqual(['Apple'])
    expect(namesIn(queryClient, HER_DAY_KEY)).toEqual([])
    expect(queryClient.getQueryData(DISH_KEY)).toBeNull()
  })
})

describe('one queue for all meal changes', () => {
  test('a dish save waits behind an earlier meal change, so it can never overtake it', async () => {
    // e.g. an older item changed offline, then a meal cooked: the change reaches the server first
    const { queryClient, wrapper } = setup()
    vi.mocked(updateMealItem).mockReturnValueOnce(new Promise(() => {}))
    const { result } = renderHook(
      () => ({ update: useUpdateMealItem('me', DAY), dish: useSaveDish() }),
      { wrapper },
    )

    act(() =>
      result.current.update.mutate({
        id: 'oats',
        patch: { entered_amount: 50, basis_multiplier: 0.5 },
      }),
    )
    act(() => result.current.dish.save({ dish: testDish() }))

    await waitFor(() => expect(updateMealItem).toHaveBeenCalledTimes(1))
    expect(saveDish).not.toHaveBeenCalled()
    const scopes = queryClient
      .getMutationCache()
      .getAll()
      .map((mutation) => mutation.options.scope?.id)
    expect(new Set(scopes).size).toBe(1)
  })
})
