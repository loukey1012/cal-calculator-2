import { createContext, use } from 'react'
import type { Profile } from '../features/household/householdApi'

/** The signed-in household member; provided once the profile has loaded. */
export type CurrentUser = { readonly profile: Profile; readonly householdId: string }

export const CurrentUserContext = createContext<CurrentUser | null>(null)

export function useCurrentUser(): CurrentUser {
  const user = use(CurrentUserContext)
  if (!user) throw new Error('useCurrentUser must be used inside CurrentUserContext')
  return user
}
