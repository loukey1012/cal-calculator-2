import { dehydrate, hydrate, onlineManager, type QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('./weightApi', () => ({
  saveWeight: vi.fn(),
  deleteWeight: vi.fn(),
  fetchWeights: vi.fn(),
}))

import { DEHYDRATE_OPTIONS, isQueuedChange } from '../../lib/persistence'
import { createQueryClient } from '../../lib/queryClient'
import { deleteWeight, saveWeight } from './weightApi'
import {
  applyWeightChange,
  applyWeightChangeLocally,
  registerWeightChangeDefaults,
  WEIGHT_CHANGES_KEY,
  type WeightChange,
} from './weightChanges'

const SAVE: WeightChange = {
  kind: 'save',
  userId: 'me',
  entry: { date: '2026-10-01', weightKg: 72.4 },
}
const DELETE: WeightChange = { kind: 'delete', userId: 'me', date: '2026-10-01' }

beforeEach(() => {
  vi.mocked(saveWeight).mockResolvedValue()
  vi.mocked(deleteWeight).mockResolvedValue()
})

afterEach(() => {
  onlineManager.setOnline(true)
  vi.clearAllMocks()
})

describe('weight changes', () => {
  test('a save and a delete reach the server', async () => {
    await applyWeightChange(SAVE)
    await applyWeightChange(DELETE)

    expect(saveWeight).toHaveBeenCalledWith('me', SAVE.entry)
    expect(deleteWeight).toHaveBeenCalledWith('me', '2026-10-01')
  })

  test('the cached weights change at once', () => {
    const saved = applyWeightChangeLocally([], SAVE)

    expect(saved).toEqual([SAVE.entry])
    expect(applyWeightChangeLocally(saved, DELETE)).toEqual([])
  })

  test('they are queued like meal changes, so they are kept on the phone', () => {
    expect(isQueuedChange([...WEIGHT_CHANGES_KEY, 'me'])).toBe(true)
  })
})

describe('weight changes survive an app restart', () => {
  function queueChange(client: QueryClient, change: WeightChange) {
    void client
      .getMutationCache()
      .build(client, { mutationKey: WEIGHT_CHANGES_KEY })
      .execute(change)
      .catch(() => {})
  }

  test('a weight saved offline is sent after restoring into a fresh app', async () => {
    onlineManager.setOnline(false)
    const before = createQueryClient()
    registerWeightChangeDefaults(before)
    queueChange(before, SAVE)
    await vi.waitFor(() => expect(before.getMutationCache().getAll()[0]?.state.isPaused).toBe(true))

    const stored = JSON.parse(JSON.stringify(dehydrate(before, DEHYDRATE_OPTIONS)))
    const after = createQueryClient()
    registerWeightChangeDefaults(after)
    hydrate(after, stored)
    onlineManager.setOnline(true)
    await after.resumePausedMutations()

    expect(saveWeight).toHaveBeenCalledTimes(1)
    expect(saveWeight).toHaveBeenCalledWith('me', SAVE.entry)
  })

  test('a restored change refreshes that person’s weights once done', async () => {
    const client = createQueryClient()
    registerWeightChangeDefaults(client)
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    await client.getMutationCache().build(client, { mutationKey: WEIGHT_CHANGES_KEY }).execute(SAVE)

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['weights', 'me'] })
  })
})
