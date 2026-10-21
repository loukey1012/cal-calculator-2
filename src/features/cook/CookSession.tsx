import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { useCurrentUser } from '../../app/currentUser'
import { useToday } from '../today/useToday'
import { NO_FILTER } from '../dishes/composerSteps'
import { mealPageOf } from '../meals/mealPages'
import { withPrefill } from './cookDraft'
import { CookSessionContext } from './cookSessionContext'
import { useCookDraft } from './useCookDraft'

/** Holds the dish being put together and the ingredient search, for every Add food page. */
export function CookSession({ children }: { readonly children: ReactNode }) {
  const { profile } = useCurrentUser()
  const today = useToday()
  const { pathname } = useLocation()
  const { draft, setDraft, reset } = useCookDraft(profile.id)
  const [filter, setFilter] = useState(NO_FILTER)
  const [handledMeal, setHandledMeal] = useState('')

  // Add food of a meal: the dish takes over its person, day and meal (once per meal opened)
  const page = mealPageOf(pathname)
  const openedMeal = page?.page === 'food' ? page.mealPath : ''
  if (openedMeal !== handledMeal) {
    setHandledMeal(openedMeal)
    if (page && openedMeal !== '') setDraft((current) => withPrefill(current, page.meal, today))
  }

  return (
    <CookSessionContext value={{ draft, setDraft, reset, filter, setFilter }}>
      {children}
    </CookSessionContext>
  )
}
