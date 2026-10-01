import { useEffect } from 'react'

// profiles.accent_color default; left to CSS so it switches to #0a84ff in dark mode like iOS
const SYSTEM_BLUE = '#007aff'

/** Overrides the default iOS blue with the user's accent color for the whole app. */
export function useAccentColor(color: string): void {
  useEffect(() => {
    if (color.toLowerCase() === SYSTEM_BLUE) return
    const root = document.documentElement
    root.style.setProperty('--accent', color)
    return () => {
      root.style.removeProperty('--accent')
    }
  }, [color])
}
