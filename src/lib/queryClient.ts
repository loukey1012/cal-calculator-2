import { QueryClient } from '@tanstack/react-query'

export const STALE_TIME_MS = 30_000

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // refetch when the PWA comes back to the foreground, so partner edits show up
      queries: { staleTime: STALE_TIME_MS, retry: 1, refetchOnWindowFocus: true },
    },
  })
}
