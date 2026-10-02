import { QueryClient } from '@tanstack/react-query'

export const STALE_TIME_MS = 30_000
/** how long data is kept, also on the phone for offline use (see persistence.ts) */
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // refetch when the PWA comes back to the foreground, so partner edits show up
      queries: {
        staleTime: STALE_TIME_MS,
        gcTime: CACHE_MAX_AGE_MS,
        retry: 1,
        refetchOnWindowFocus: true,
      },
      // only meal changes wait for a connection (see dayChanges.ts); other edits fail fast offline
      mutations: { networkMode: 'always' },
    },
  })
}
