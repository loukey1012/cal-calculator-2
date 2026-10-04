import { useEffect, useSyncExternalStore } from 'react'
import { APPEARANCE_CACHE_KEY } from '../../lib/persistence'
import type { Profile } from '../household/householdApi'
import { appearanceVariables, parseAppearance, resolveScheme, type Scheme } from './appearance'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function subscribeToDarkMode(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

export function usePrefersDark(): boolean {
  return useSyncExternalStore(subscribeToDarkMode, () => window.matchMedia(DARK_QUERY).matches)
}

type AppearanceCache = {
  readonly theme: string
  readonly darkStyle: string
  readonly variables: Record<string, string>
}

/** The account stays the source of truth: every profile load overwrites this mirror. */
function writeCache(cache: AppearanceCache): void {
  try {
    localStorage.setItem(APPEARANCE_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // private browsing or full storage: the app just starts in the default colors
  }
}

/** Paints the whole app in the profile's theme, dark style, accent and goal colors. */
export function useAppearance(profile: Pick<Profile, 'appearance' | 'accent_color'>): void {
  const prefersDark = usePrefersDark()
  const appearance = parseAppearance(profile.appearance)
  const scheme: Scheme = resolveScheme(appearance, prefersDark)
  const accent = profile.accent_color.toLowerCase()
  const { theme, darkStyle, goalPalette } = appearance

  useEffect(() => {
    const root = document.documentElement
    const variables = appearanceVariables(goalPalette, scheme, accent)
    root.dataset.scheme = scheme
    for (const [name, value] of Object.entries(variables)) root.style.setProperty(name, value)
    writeCache({ theme, darkStyle, variables })
    return () => {
      // signed out: back to the device's own light/dark look
      root.dataset.scheme = window.matchMedia(DARK_QUERY).matches ? 'soft' : 'light'
      for (const name of Object.keys(variables)) root.style.removeProperty(name)
    }
  }, [scheme, accent, theme, darkStyle, goalPalette])
}
