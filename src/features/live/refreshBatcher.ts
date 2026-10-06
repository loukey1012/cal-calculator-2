import type { QueryKey } from '@tanstack/react-query'

/** One save can send a burst of hints (a dish touches several days): wait for the burst to end. */
export const BATCH_DELAY_MS = 300

type BatcherOptions = {
  readonly refresh: (keys: readonly QueryKey[]) => void
  /**
   * True while my own changes are still being saved. Refreshing then could briefly show the
   * server's older version over my change; those saves refresh everything they touch anyway.
   */
  readonly hasPendingChanges: () => boolean
}

export type RefreshBatcher = {
  readonly add: (keys: readonly QueryKey[]) => void
  readonly stop: () => void
}

/** Collects out-of-date query keys and refreshes them together, each once. */
export function createRefreshBatcher({
  refresh,
  hasPendingChanges,
}: BatcherOptions): RefreshBatcher {
  let waiting = new Map<string, QueryKey>()
  let timer: ReturnType<typeof setTimeout> | undefined

  const flush = () => {
    timer = undefined
    if (hasPendingChanges()) {
      schedule()
      return
    }
    const keys = [...waiting.values()]
    waiting = new Map()
    if (keys.length > 0) refresh(keys)
  }

  const schedule = () => {
    timer ??= setTimeout(flush, BATCH_DELAY_MS)
  }

  return {
    add: (keys) => {
      if (keys.length === 0) return
      waiting = new Map([...waiting, ...keys.map((key) => [JSON.stringify(key), key] as const)])
      schedule()
    },
    stop: () => {
      clearTimeout(timer)
      timer = undefined
      waiting = new Map()
    },
  }
}
