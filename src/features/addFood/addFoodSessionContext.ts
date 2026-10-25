import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'
import type { IngredientFilter } from '../ingredients/listing'
import type { AddFoodDraft } from './addFoodDraft'

/**
 * What the Add food pages share: each step is a page of its own (the page below shows while a
 * swipe goes back), so the dish and the search live above them, once for the app.
 */
type AddFoodSessionValue = {
  readonly draft: AddFoodDraft
  readonly setDraft: Dispatch<SetStateAction<AddFoodDraft>>
  /** a fresh draft, e.g. after saving */
  readonly reset: () => void
  /** the ingredient search and category, kept while going to the amount and back */
  readonly filter: IngredientFilter
  readonly setFilter: (filter: IngredientFilter) => void
}

export const AddFoodSessionContext = createContext<AddFoodSessionValue | null>(null)

export function useAddFoodSession(): AddFoodSessionValue {
  const session = useContext(AddFoodSessionContext)
  if (!session) throw new Error('useAddFoodSession must be used inside <AddFoodSession>')
  return session
}
