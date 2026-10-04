import { useCurrentUser } from '../../app/currentUser'
import { parseAppearance, type Appearance } from './appearance'

/** The signed-in user's own appearance choices. */
export function useMyAppearance(): Appearance {
  return parseAppearance(useCurrentUser().profile.appearance)
}
