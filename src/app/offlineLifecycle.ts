import { useIsRestoring, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { saveCacheNow } from '../lib/persistence'

/**
 * Sends meal changes queued offline in an earlier session. Runs once a signed-in app is ready,
 * so changes never go out before the session (and account) is known.
 */
export function useResumeOfflineChanges(): void {
  const queryClient = useQueryClient()
  const isRestoring = useIsRestoring()
  useEffect(() => {
    if (!isRestoring) void queryClient.resumePausedMutations()
  }, [queryClient, isRestoring])
}

/**
 * iOS may kill a backgrounded PWA without warning: write the cache the moment it is hidden,
 * synchronously, since anything scheduled for later may never run.
 */
export function useSaveWhenHidden(): void {
  const queryClient = useQueryClient()
  useEffect(() => {
    const save = () => saveCacheNow(queryClient)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') save()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', save)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', save)
    }
  }, [queryClient])
}
