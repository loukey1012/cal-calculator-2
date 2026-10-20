import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { newCookDraft, type CookDraft } from './cookDraft'
import { draftNotice, sendDraftNotice } from './draftNotice'
import { clearCookDraft, loadCookDraft, saveCookDraft } from './draftStorage'

type CookDraftState = {
  readonly draft: CookDraft
  readonly setDraft: Dispatch<SetStateAction<CookDraft>>
  /** a fresh draft, e.g. after saving */
  readonly reset: () => void
}

// changes in quick succession (typing an amount) are noted once
const NOTICE_DELAY_MS = 3000

/**
 * Tells the server about a dish waiting on Cook, for the "not logged yet" notification. A
 * logged or discarded dish is forgotten at once, and a waiting note goes out when the app goes
 * to the background, so iOS closing it doesn't leave a wrong one. Opening the app sends
 * nothing: that would restart the dish's clock. Best effort: offline, the next change retries.
 */
function useDraftNotice(userId: string, draft: CookDraft): void {
  const isFirst = useRef(true)
  const pending = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    const notice = draftNotice(draft)
    const send = () => {
      pending.current = null
      sendDraftNotice(userId, notice).catch(() => {
        // offline or refused: the dish is still on the phone and the Cook badge shows it;
        // only the reminder may not come
      })
    }
    if (notice === null) return send()
    pending.current = send
    const timer = setTimeout(send, NOTICE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [userId, draft])

  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') pending.current?.()
    }
    document.addEventListener('visibilitychange', flush)
    return () => document.removeEventListener('visibilitychange', flush)
  }, [])
}

/** The person's Cook draft, kept on this phone after every change. */
export function useCookDraft(userId: string): CookDraftState {
  const [draft, setDraft] = useState(() => loadCookDraft(userId) ?? newCookDraft(userId))

  useEffect(() => {
    saveCookDraft(userId, draft)
  }, [userId, draft])
  useDraftNotice(userId, draft)

  const reset = () => {
    clearCookDraft(userId)
    setDraft(newCookDraft(userId))
  }
  return { draft, setDraft, reset }
}
