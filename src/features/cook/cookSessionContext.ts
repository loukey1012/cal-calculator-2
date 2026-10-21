import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'
import type { IngredientFilter } from '../ingredients/listing'
import type { CookDraft } from './cookDraft'

/**
 * What the Add food pages share: each step is a page of its own (the page below shows while a
 * swipe goes back), so the dish and the search live above them, once for the app.
 */
export type CookSessionValue = {
  readonly draft: CookDraft
  readonly setDraft: Dispatch<SetStateAction<CookDraft>>
  /** a fresh draft, e.g. after saving */
  readonly reset: () => void
  /** the ingredient search and category, kept while going to the amount and back */
  readonly filter: IngredientFilter
  readonly setFilter: (filter: IngredientFilter) => void
}

export const CookSessionContext = createContext<CookSessionValue | null>(null)

export function useCookSession(): CookSessionValue {
  const session = useContext(CookSessionContext)
  if (!session) throw new Error('useCookSession must be used inside <CookSession>')
  return session
}
