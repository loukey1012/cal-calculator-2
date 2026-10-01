import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { LoginInput, SignUpInput } from './validation'

export type SignUpResult = { readonly needsEmailConfirmation: boolean }

export async function signIn(credentials: LoginInput): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword(credentials)
  if (error) throw error
}

export async function signUp({ displayName, email, password }: SignUpInput): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // copied into public.profiles.display_name by the on_auth_user_created trigger
    options: { data: { display_name: displayName } },
  })
  if (error) throw error
  return { needsEmailConfirmation: !data.session }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export function onSessionChange(listener: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => listener(session))
  return () => data.subscription.unsubscribe()
}
