import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useEffect } from 'react'
import { isQueuedChange } from '../../lib/persistence'
import { openLiveChannel, type LiveChannel } from './liveChannel'
import { keysForHint, parseHint } from './liveEvent'
import { createRefreshBatcher } from './refreshBatcher'

/** Matches every query: used to catch up after missing hints while disconnected. */
const EVERYTHING: QueryKey = []

/**
 * Keeps the household's data current while the app is open: a change from another phone marks
 * what it touched out of date, and whatever is on screen re-fetches quietly in the background.
 * - iOS drops the connection in the background anyway, so the channel is closed while hidden and
 *   opened again when shown; every reconnect refreshes everything once, for missed hints.
 * - A channel is only opened once the previous one has left: supabase-js would otherwise hand
 *   back the one still leaving.
 * - Refreshes wait while my own changes are still being saved (see createRefreshBatcher).
 */
export function useLiveUpdates(householdId: string): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    const batcher = createRefreshBatcher({
      refresh: (keys) => {
        for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey })
      },
      hasPendingChanges: () =>
        queryClient.isMutating({
          predicate: (mutation) => isQueuedChange(mutation.options.mutationKey),
        }) > 0,
    })
    // the app fetches what it shows when it opens: only later connections need to catch up
    let hasConnected = false
    let channel: LiveChannel | null = null
    let left: Promise<unknown> = Promise.resolve()
    let isWanted = false

    const connect = () => {
      if (!isWanted || channel) return
      channel = openLiveChannel(householdId, {
        onHint: (payload) => {
          const hint = parseHint(payload)
          if (hint) batcher.add(keysForHint(hint, householdId))
        },
        onConnected: () => {
          if (hasConnected) batcher.add([EVERYTHING])
          hasConnected = true
        },
      })
    }
    const open = () => {
      isWanted = true
      void left.then(connect)
    }
    const close = () => {
      isWanted = false
      if (channel) left = channel.close()
      channel = null
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') open()
      else close()
    }

    onVisibilityChange()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      close()
      batcher.stop()
    }
  }, [queryClient, householdId])
}
