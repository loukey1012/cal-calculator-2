import { useEffect, useState } from 'react'
import type { Appearance } from './appearance'
import { DEFAULT_GLASS_FIELD, fieldSpots, fieldVariables } from './glassField'

// one number per app start, so random and cycle start somewhere new each time
const START_SEED = Math.floor(Math.random() * 1_000_000)

// the style mode follows the ring colors painted by useAppearance
const RING_VARIABLES = {
  kcal: 'var(--goal-kcal)',
  fat: 'var(--goal-fat)',
  fiber: 'var(--goal-fiber)',
} as const

/**
 * Paints the color background behind Liquid Glass Full (see index.css): the spots of the chosen
 * mode as CSS variables on the root. Random and cycle move on with every tab change, or once per
 * app start. `progress` is today's calories as a share of the goal (goal-aware), or null.
 */
export function useGlassField(
  appearance: Appearance,
  activeTab: number,
  progress: number | null,
): void {
  const field = appearance.glassField ?? DEFAULT_GLASS_FIELD
  const enabled = appearance.glass === 'all'

  // count tab changes (adjusted while rendering, like other derived state here)
  const [lastTab, setLastTab] = useState(activeTab)
  const [tabChanges, setTabChanges] = useState(0)
  if (lastTab !== activeTab) {
    setLastTab(activeTab)
    setTabChanges((changes) => changes + 1)
  }

  const seed = START_SEED + (field.changeOn === 'tab' ? tabChanges : 0)
  const spots = fieldSpots(field, { ring: RING_VARIABLES, seed, progress })
  // strings, so an equal field from the next profile load doesn't repaint
  const variables = JSON.stringify(fieldVariables(spots, field.strength))
  const drift = field.drift

  useEffect(() => {
    if (!enabled) return
    const root = document.documentElement
    const painted: Record<string, string> = JSON.parse(variables)
    for (const [name, value] of Object.entries(painted)) root.style.setProperty(name, value)
    if (drift) root.dataset.glassDrift = 'on'
    return () => {
      for (const name of Object.keys(painted)) root.style.removeProperty(name)
      delete root.dataset.glassDrift
    }
  }, [enabled, variables, drift])
}
