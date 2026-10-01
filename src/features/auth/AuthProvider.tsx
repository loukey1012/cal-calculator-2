import type { Session } from '@supabase/supabase-js'
import { useEffect, useState, type ReactNode } from 'react'
import { getSession, onSessionChange } from './authApi'
import { AuthContext, type AuthState } from './authContext'

function toAuthState(session: Session | null): AuthState {
  return session ? { status: 'signedIn', session } : { status: 'signedOut' }
}

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    getSession()
      .then((session) => {
        if (active) setState(toAuthState(session))
      })
      .catch(() => {
        // an unreadable stored session just means logging in again
        if (active) setState({ status: 'signedOut' })
      })
    const unsubscribe = onSessionChange((session) => setState(toAuthState(session)))
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return <AuthContext value={state}>{children}</AuthContext>
}
