/**
 * A newer version the service worker downloaded while the app was open, waiting to take over.
 * Filled by registerServiceWorker.ts, shown by UpdateToasts.
 */
export type UpdateReady = {
  readonly isReady: () => boolean
  /** called with the step that hands over to the waiting version and reloads */
  readonly markReady: (apply: () => void) => void
  readonly apply: () => void
  /** returns a way to stop listening */
  readonly subscribe: (listener: () => void) => () => void
}

export function createUpdateReady(): UpdateReady {
  let applyUpdate: (() => void) | null = null
  const listeners = new Set<() => void>()
  return {
    isReady: () => applyUpdate !== null,
    markReady: (apply) => {
      applyUpdate = apply
      for (const listener of listeners) listener()
    },
    apply: () => applyUpdate?.(),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/** The app's one waiting update. */
export const updateReady = createUpdateReady()
