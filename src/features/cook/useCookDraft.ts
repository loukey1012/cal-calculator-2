import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { newCookDraft, type CookDraft } from './cookDraft'
import { clearCookDraft, loadCookDraft, saveCookDraft } from './draftStorage'

type CookDraftState = {
  readonly draft: CookDraft
  readonly setDraft: Dispatch<SetStateAction<CookDraft>>
  /** a fresh draft, e.g. after saving */
  readonly reset: () => void
}

/** The person's Cook draft, kept on this phone after every change. */
export function useCookDraft(userId: string): CookDraftState {
  const [draft, setDraft] = useState(() => loadCookDraft(userId) ?? newCookDraft(userId))

  useEffect(() => {
    saveCookDraft(userId, draft)
  }, [userId, draft])

  const reset = () => {
    clearCookDraft(userId)
    setDraft(newCookDraft(userId))
  }
  return { draft, setDraft, reset }
}
