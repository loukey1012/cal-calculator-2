import { useCurrentUser } from '../../app/currentUser'
import { useUpdateProfile } from '../household/hooks'
import { parseAppearance, resolveScheme, type Appearance } from './appearance'
import { usePrefersDark } from './useAppearance'

/** The signed-in user's appearance and how to change one choice, keeping all the others. */
export function useAppearanceSettings() {
  const { profile } = useCurrentUser()
  const update = useUpdateProfile(profile.id)
  const prefersDark = usePrefersDark()
  const appearance = parseAppearance(profile.appearance)
  const scheme = resolveScheme(appearance, prefersDark)

  function change<K extends keyof Appearance>(key: K, value: Appearance[K]): void {
    update.mutate({ appearance: { ...appearance, [key]: value } })
  }

  return { profile, appearance, scheme, update, change }
}
