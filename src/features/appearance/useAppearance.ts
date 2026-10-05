import { useEffect, useSyncExternalStore } from 'react'
import { APPEARANCE_CACHE_KEY } from '../../lib/persistence'
import type { Profile } from '../household/householdApi'
import {
  appearanceVariables,
  DEFAULT_APPEARANCE,
  parseAppearance,
  resolveScheme,
  type Scheme,
} from './appearance'
import { applyAppIcon } from './appIcon'

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
  readonly lightStyle: string
  readonly darkStyle: string
  readonly appIcon: string
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

/**
 * Paints the whole app in the profile's theme, light and dark style, accent and goal colors
 * (custom ones included), and offers the profile's app icon for the home screen.
 */
export function useAppearance(profile: Pick<Profile, 'appearance' | 'accent_color'>): void {
  const prefersDark = usePrefersDark()
  const appearance = parseAppearance(profile.appearance)
  const scheme: Scheme = resolveScheme(appearance, prefersDark)
  const accent = profile.accent_color.toLowerCase()
  const { theme, lightStyle, darkStyle, goalPalette, appIcon } = appearance
  // a string, so a new but equal object from the next profile load doesn't repaint
  const customColors = JSON.stringify(appearance.customGoalColors ?? {})

  useEffect(() => {
    const root = document.documentElement
    const variables = appearanceVariables(goalPalette, scheme, accent, JSON.parse(customColors))
    root.dataset.scheme = scheme
    for (const [name, value] of Object.entries(variables)) root.style.setProperty(name, value)
    writeCache({ theme, lightStyle, darkStyle, appIcon, variables })
    return () => {
      // signed out: back to the device's own light/dark look
      root.dataset.scheme = window.matchMedia(DARK_QUERY).matches ? 'soft' : 'light'
      for (const name of Object.keys(variables)) root.style.removeProperty(name)
    }
  }, [scheme, accent, theme, lightStyle, darkStyle, goalPalette, appIcon, customColors])

  useEffect(() => {
    applyAppIcon(appIcon)
    // signed out: back to the default icon
    return () => applyAppIcon(DEFAULT_APPEARANCE.appIcon)
  }, [appIcon])
}
