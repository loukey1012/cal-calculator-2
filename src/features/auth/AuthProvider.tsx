import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { clearPersistedCache } from '../../lib/persistence'
import { getSession, onSessionChange } from './authApi'
import { AuthContext, type AuthState } from './authContext'

function toAuthState(session: Session | null): AuthState {
  return session ? { status: 'signedIn', session } : { status: 'signedOut' }
}

/** undefined = not known yet (app start) */
type KnownUser = string | null | undefined

/** Signed out, or a different account than before: nothing cached may carry over. */
function isAccountChange(previous: KnownUser, next: string | null): boolean {
  return previous === undefined ? next === null : previous !== next
}

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const knownUser = useRef<KnownUser>(undefined)

  useEffect(() => {
    let active = true
    const applySession = (session: Session | null) => {
      const userId = session?.user.id ?? null
      if (isAccountChange(knownUser.current, userId)) {
        // covers expired sessions and offline log-outs too, not just the Log out button
        queryClient.clear()
        void clearPersistedCache()
      }
      knownUser.current = userId
      setState(toAuthState(session))
    }

    getSession()
      .then((session) => {
        if (active) applySession(session)
      })
      .catch(() => {
        // an unreadable stored session just means logging in again
        if (active) applySession(null)
      })
    const unsubscribe = onSessionChange(applySession)
    return () => {
      active = false
      unsubscribe()
    }
  }, [queryClient])

  return <AuthContext value={state}>{children}</AuthContext>
}
