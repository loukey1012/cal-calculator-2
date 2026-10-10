import { useCallback, useEffect, useState } from 'react'

// long enough to notice a mistake, short enough not to undo much later typing
export const UNDO_MS = 8000

/** What was just changed, shown next to the button that did it (e.g. "per100g"). */
export type UndoOffer = { readonly where: string; readonly message: string }

export type Undo<T> = {
  readonly offer: UndoOffer | null
  readonly offerUndo: (where: string, message: string, previous: T) => void
  readonly undo: () => void
  /** drops the offer, e.g. once something else was typed: Undo would revert that too */
  readonly dismiss: () => void
}

/** One step of undo for the form's buttons; it goes away after a few seconds. */
export function useUndo<T>(restore: (previous: T) => void): Undo<T> {
  const [pending, setPending] = useState<(UndoOffer & { readonly previous: T }) | null>(null)

  useEffect(() => {
    if (pending === null) return
    const timer = setTimeout(() => setPending(null), UNDO_MS)
    return () => clearTimeout(timer)
  }, [pending])

  const offerUndo = useCallback(
    (where: string, message: string, previous: T) => setPending({ where, message, previous }),
    [],
  )

  return {
    offer: pending && { where: pending.where, message: pending.message },
    offerUndo,
    undo: () => {
      if (pending === null) return
      restore(pending.previous)
      setPending(null)
    },
    dismiss: () => setPending(null),
  }
}
