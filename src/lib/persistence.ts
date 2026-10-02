import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { defaultShouldDehydrateQuery, type DehydrateOptions } from '@tanstack/react-query'
import type { PersistedClient } from '@tanstack/react-query-persist-client'

/** localStorage key holding the cached data and the queued offline changes */
export const PERSIST_KEY = 'calculator2-cache'
/** bump when cached data shapes change, so old caches are discarded instead of misread */
export const CACHE_BUSTER = '1'
// short, so a change logged right before iOS suspends the app is still written (also see
// useSaveWhenHidden). Never bump CACHE_BUSTER while changes could be queued: they would be lost.
const SAVE_THROTTLE_MS = 250
// mutation keys of meal changes start with this (see features/meals/dayChanges.ts)
const DAY_CHANGE_KEY_ROOT = 'day'

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
  // every unfinished meal change, paused or still being sent; only these can be resumed after a
  // restart (they have registered defaults)
  shouldDehydrateMutation: (mutation) =>
    mutation.state.status === 'pending' &&
    mutation.options.mutationKey?.[0] === DAY_CHANGE_KEY_ROOT,
}

/** Removes this account's cached data and queued changes from the phone. */
export async function clearPersistedCache(): Promise<void> {
  await persister.removeClient()
}
