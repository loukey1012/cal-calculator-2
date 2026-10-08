import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'
import type { CookDraft } from './cookDraft'

// after saving, unless Cook was opened from somewhere else
export const COOK_HOME = '/today'

/**
 * What the Cook tab's pages share: each step is a page of its own (the page below shows while a
 * swipe goes back), so the draft and the search live above them, once for the tab.
 */
export type CookSessionValue = {
  readonly draft: CookDraft
  readonly setDraft: Dispatch<SetStateAction<CookDraft>>
  /** a fresh draft, e.g. after saving */
  readonly reset: () => void
  /** where saving leads: Today, or where an empty meal opened Cook from */
  readonly returnTo: string
  readonly setReturnTo: (path: string) => void
  /** the ingredient search, kept while going to the amount and back */
  readonly search: string
  readonly setSearch: (query: string) => void
}

export const CookSessionContext = createContext<CookSessionValue | null>(null)

export function useCookSession(): CookSessionValue {
  const session = useContext(CookSessionContext)
  if (!session) throw new Error('useCookSession must be used inside <CookSession>')
  return session
}
