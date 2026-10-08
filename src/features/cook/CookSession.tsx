import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { useCurrentUser } from '../../app/currentUser'
import { useToday } from '../today/useToday'
import { NO_FILTER } from '../dishes/composerSteps'
import { withPrefill } from './cookDraft'
import { parseCookLink } from './cookLink'
import { COOK_HOME, CookSessionContext } from './cookSessionContext'
import { useCookDraft } from './useCookDraft'

/** Holds the Cook tab's draft and ingredient search for all of its pages. */
export function CookSession({ children }: { readonly children: ReactNode }) {
  const { profile } = useCurrentUser()
  const today = useToday()
  const [params] = useSearchParams()
  const { draft, setDraft, reset } = useCookDraft(profile.id)
  const [returnTo, setReturnTo] = useState(COOK_HOME)
  const [filter, setFilter] = useState(NO_FILTER)
  const [handledLink, setHandledLink] = useState('')

  // opened from an empty meal: take over its person, day and meal (once per link)
  const link = params.toString()
  if (link !== handledLink) {
    setHandledLink(link)
    const parsed = parseCookLink(params, today)
    if (parsed) {
      setDraft((current) => withPrefill(current, parsed.prefill, today))
      setReturnTo(parsed.returnTo)
    }
  }

  return (
    <CookSessionContext
      value={{ draft, setDraft, reset, returnTo, setReturnTo, filter, setFilter }}
    >
      {children}
    </CookSessionContext>
  )
}
