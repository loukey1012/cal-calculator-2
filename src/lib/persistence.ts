import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import {
  defaultShouldDehydrateQuery,
  dehydrate,
  type DehydrateOptions,
  type QueryClient,
} from '@tanstack/react-query'
import type { PersistedClient } from '@tanstack/react-query-persist-client'

/** localStorage key holding the cached data and the queued offline changes */
export const PERSIST_KEY = 'calculator2-cache'
/** bump when cached data shapes change, so old caches are discarded instead of misread */
export const CACHE_BUSTER = '1'
// short, so a change logged right before iOS suspends the app is still written (also see
// useSaveWhenHidden). Never bump CACHE_BUSTER while changes could be queued: they would be lost.
const SAVE_THROTTLE_MS = 250
// mutation keys of queued changes start with one of these (meals/dayChanges.ts, dishes/dishChanges.ts)
const QUEUED_CHANGE_KEY_ROOTS: readonly unknown[] = ['day', 'dish']

/** Meal and dish changes: queued offline, stored on the phone and sent in order. */
export function isQueuedChange(mutationKey: readonly unknown[] | undefined): boolean {
  return QUEUED_CHANGE_KEY_ROOTS.includes(mutationKey?.[0])
}

/** Private browsing (or full storage) can make localStorage unusable; then nothing is persisted. */
function availableStorage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

/**
 * Unfinished changes are stored as paused, because only paused changes are resumed after a
 * restart. Otherwise a change still being sent (or retried) when iOS closes the app would be lost.
 */
export function serializeCache(client: PersistedClient): string {
  const mutations = client.clientState.mutations.map((mutation) =>
    mutation.state.status === 'pending'
      ? { ...mutation, state: { ...mutation.state, isPaused: true } }
      : mutation,
  )
  return JSON.stringify({ ...client, clientState: { ...client.clientState, mutations } })
}

export function deserializeCache(raw: string): PersistedClient {
  return JSON.parse(raw) as PersistedClient
}

export const persister = createAsyncStoragePersister({
  storage: availableStorage(),
  key: PERSIST_KEY,
  throttleTime: SAVE_THROTTLE_MS,
  serialize: serializeCache,
  deserialize: deserializeCache,
})

export const DEHYDRATE_OPTIONS: DehydrateOptions = {
  shouldDehydrateQuery: defaultShouldDehydrateQuery,
  // every unfinished meal or dish change, paused or still being sent; only these can be resumed
  // after a restart (they have registered defaults)
  shouldDehydrateMutation: (mutation) =>
    mutation.state.status === 'pending' && isQueuedChange(mutation.options.mutationKey),
}

/**
 * Writes the cache right now, synchronously. The persister writes at most every SAVE_THROTTLE_MS,
 * so when iOS is about to end the app the latest changes could otherwise still be waiting.
 */
export function saveCacheNow(queryClient: QueryClient): void {
  const storage = availableStorage()
  if (!storage) return
  const client: PersistedClient = {
    buster: CACHE_BUSTER,
    timestamp: Date.now(),
    clientState: dehydrate(queryClient, DEHYDRATE_OPTIONS),
  }
  try {
    storage.setItem(PERSIST_KEY, serializeCache(client))
  } catch {
    // full storage: the regular (throttled) save keeps trying
  }
}

/**
 * localStorage mirror of the account's look (theme, colors), written by useAppearance and read
 * by the inline script in index.html so the app starts in the right colors.
 */
export const APPEARANCE_CACHE_KEY = 'calculator-appearance'

/** On sign-out or account switch: nothing of the previous account may stay on the phone. */
export async function clearPersistedCache(): Promise<void> {
  await persister.removeClient()
  try {
    window.localStorage.removeItem(APPEARANCE_CACHE_KEY)
  } catch {
    // no storage (private browsing): nothing was cached
  }
}
