import { useCurrentUser } from '../../app/currentUser'
import { useMyAppearance } from '../appearance/useMyAppearance'
import type { Profile } from './householdApi'
import { lookFor, type PersonLook } from './partnerLook'

/** How to show each household member to you: your partner by the nickname and symbol you gave. */
export function useLookOf(): (person: Profile) => PersonLook {
  const { profile } = useCurrentUser()
  const { partnerLooks } = useMyAppearance()
  return (person) => lookFor(person, profile.id, partnerLooks)
}
