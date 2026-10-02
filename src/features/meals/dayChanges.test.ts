import { dehydrate, hydrate, onlineManager, QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('./mealsApi', () => ({
  addMealItem: vi.fn(),
  updateMealItem: vi.fn(),
  deleteMealItem: vi.fn(),
}))

import { createQueryClient } from '../../lib/queryClient'
import { ApiError } from '../../lib/errors'
import { DEHYDRATE_OPTIONS, deserializeCache, serializeCache } from '../../lib/persistence'
import {
  applyDayChange,
  applyDayChangeLocally,
  dayChangeKey,
  registerDayChangeDefaults,
  retryDelayFor,
  retryNetworkErrors,
  type DayChange,
} from './dayChanges'
import { addMealItem, deleteMealItem, updateMealItem } from './mealsApi'
import { dayMeal, mealItem } from './testData'

const DRAFT = {
  ingredient_id: null,
  name: 'Apple',
  brand: null,
  entered_amount: 150,
  entered_unit: 'g' as const,
  basis: 'per_100g' as const,
  basis_multiplier: 1.5,
  kcal: 52,
  protein: null,
  carbs: null,
  sugar: null,
  fat: null,
  sat_fat: null,
  fiber: null,
  salt: null,
}
const ADD: DayChange = {
  kind: 'add',
  userId: 'u1',
  date: '2026-10-01',
  id: 'item-1',
  mealType: 'lunch',
  draft: DRAFT,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(addMealItem).mockResolvedValue()
  vi.mocked(updateMealItem).mockResolvedValue()
  vi.mocked(deleteMealItem).mockResolvedValue()
})

afterEach(() => {
  onlineManager.setOnline(true)
})

describe('applyDayChange', () => {
  test('sends each kind of change to the API with everything it needs', async () => {
    await applyDayChange(ADD)
    await applyDayChange({
      kind: 'update',
      userId: 'u1',
      date: '2026-10-01',
      id: 'item-1',
      patch: { entered_amount: 200, basis_multiplier: 2 },
    })
    await applyDayChange({ kind: 'delete', userId: 'u1', date: '2026-10-01', id: 'item-1' })

    expect(addMealItem).toHaveBeenCalledWith({
      id: 'item-1',
      userId: 'u1',
      date: '2026-10-01',
      mealType: 'lunch',
      draft: DRAFT,
    })
    expect(updateMealItem).toHaveBeenCalledWith('item-1', {
      entered_amount: 200,
      basis_multiplier: 2,
    })
    expect(deleteMealItem).toHaveBeenCalledWith('item-1')
  })
})

describe('retrying', () => {
  test('network failures are retried for as long as it takes, server rejections are not', () => {
    expect(retryNetworkErrors(50, new TypeError('Load failed'))).toBe(true)
    expect(
      retryNetworkErrors(50, ApiError.from({ message: 'TypeError: Load failed', code: '' })),
    ).toBe(true)
    expect(retryNetworkErrors(0, new ApiError('violates check constraint', '23514'))).toBe(false)
  })

  test('waits longer after each failure, at most 30 seconds', () => {
    expect(retryDelayFor(0)).toBe(1000)
    expect(retryDelayFor(3)).toBe(8000)
    expect(retryDelayFor(20)).toBe(30_000)
  })
})

describe('applyDayChangeLocally', () => {
  const DAY = [dayMeal('m1', 'lunch', [mealItem({ id: 'existing' })])]

  test('adds, updates and removes items in the cached day', () => {
    const added = applyDayChangeLocally(DAY, ADD)
    expect(added[0]?.meal_items.map((item) => item.id)).toEqual(['existing', 'item-1'])

    const updated = applyDayChangeLocally(DAY, {
      kind: 'update',
      userId: 'u1',
      date: '2026-10-01',
      id: 'existing',
      patch: { entered_amount: 5, basis_multiplier: 0.05 },
    })
    expect(updated[0]?.meal_items[0]).toMatchObject({ entered_amount: 5 })

    const removed = applyDayChangeLocally(DAY, {
      kind: 'delete',
      userId: 'u1',
      date: '2026-10-01',
      id: 'existing',
    })
    expect(removed[0]?.meal_items).toEqual([])
  })
})

describe('offline changes survive an app restart', () => {
  function queueOfflineChange(client: QueryClient, change: DayChange) {
    const key = dayChangeKey(change.userId, change.date)
    void client
      .getMutationCache()
      .build(client, { mutationKey: key, scope: { id: key.join(':') } })
      .execute(change)
      .catch(() => {})
  }

  test('a change queued offline is stored and sent after restoring into a fresh app', async () => {
    onlineManager.setOnline(false)
    const before = createQueryClient()
    registerDayChangeDefaults(before)
    queueOfflineChange(before, ADD)
    await vi.waitFor(() => expect(before.getMutationCache().getAll()[0]?.state.isPaused).toBe(true))

    // what gets written to the phone's storage, then read by the restarted app
    const stored = JSON.parse(JSON.stringify(dehydrate(before, DEHYDRATE_OPTIONS)))
    const after = createQueryClient()
    registerDayChangeDefaults(after)
    hydrate(after, stored)
    onlineManager.setOnline(true)
    await after.resumePausedMutations()

    expect(addMealItem).toHaveBeenCalledTimes(1)
    expect(addMealItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'item-1', userId: 'u1' }),
    )
  })

  test('a restored change refreshes its day once it is done', async () => {
    const client = createQueryClient()
    registerDayChangeDefaults(client)
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    await client
      .getMutationCache()
      .build(client, { mutationKey: dayChangeKey('u1', '2026-10-01') })
      .execute(ADD)

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['day', 'u1', '2026-10-01'] })
  })

  test('a change that was still being sent when the app closed is resent after a restart', async () => {
    const before = createQueryClient()
    registerDayChangeDefaults(before)
    vi.mocked(addMealItem).mockReturnValueOnce(new Promise(() => {}))
    queueOfflineChange(before, ADD)
    await vi.waitFor(() => expect(addMealItem).toHaveBeenCalledTimes(1))

    const stored = deserializeCache(
      serializeCache({
        timestamp: 0,
        buster: '1',
        clientState: dehydrate(before, DEHYDRATE_OPTIONS),
      }),
    )
    const after = createQueryClient()
    registerDayChangeDefaults(after)
    hydrate(after, stored.clientState)
    await after.resumePausedMutations()

    expect(addMealItem).toHaveBeenCalledTimes(2)
    expect(addMealItem).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'item-1' }))
  })

  test('only pending day changes are stored, not other mutations', () => {
    onlineManager.setOnline(false)
    const client = createQueryClient()
    registerDayChangeDefaults(client)
    void client
      .getMutationCache()
      .build(client, { mutationKey: ['ingredients'], mutationFn: () => Promise.resolve() })
      .execute(undefined)

    expect(dehydrate(client, DEHYDRATE_OPTIONS).mutations).toEqual([])
  })
})
