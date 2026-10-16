import { useEffect, useState } from 'react'
import type { Appearance } from './appearance'
import { DEFAULT_GLASS_FIELD, PAINTED_RING, fieldSpots, fieldVariables } from './glassField'
import { useRandomPlaces } from './useRandomPlaces'

// one number per app start, so random places and colors start somewhere new each time
const START_SEED = Math.floor(Math.random() * 1_000_000)

// the keyframes in index.css that move the spots
const MOVE_ANIMATION_PREFIX = 'glass-move-'

/**
 * Every element painting the field (the tab shell, each sliding page layer, the preview) runs the
 * moving animation on its own. Pinning each one's start to time zero of the page keeps them in
 * step, so a page sliding over another shows the spots where the page below has them.
 */
function keepMotionInStep(): () => void {
  const onStart = (event: Event) => {
    const { animationName } = event as AnimationEvent
    const target = event.target
    if (!animationName?.startsWith(MOVE_ANIMATION_PREFIX)) return
    if (!(target instanceof Element) || typeof target.getAnimations !== 'function') return
    for (const animation of target.getAnimations()) {
      if ((animation as Partial<CSSAnimation>).animationName === animationName) {
        animation.startTime = 0
      }
    }
  }
  document.addEventListener('animationstart', onStart)
  return () => document.removeEventListener('animationstart', onStart)
}

/**
 * Paints the color background behind Liquid Glass Full (see index.css): the spots as CSS
 * variables on the root, and the speed of moving spots as `data-glass-moving`. Random places
 * (useRandomPlaces) and cycle or random colors move on with every tab change, or once per app
 * start, each as chosen.
 */
export function useGlassField(appearance: Appearance, activeTab: number): void {
  const field = appearance.glassField ?? DEFAULT_GLASS_FIELD
  const enabled = appearance.glass === 'all'

  // count tab changes (adjusted while rendering, like other derived state here)
  const [lastTab, setLastTab] = useState(activeTab)
  const [tabChanges, setTabChanges] = useState(0)
  if (lastTab !== activeTab) {
    setLastTab(activeTab)
    setTabChanges((changes) => changes + 1)
  }

  const { position, colors } = field
  const places = useRandomPlaces(field, tabChanges, START_SEED)
  const colorSeed = START_SEED + (colors.changeOn === 'tab' ? tabChanges : 0)
  const spots = fieldSpots(field, { ring: PAINTED_RING, places, colorSeed })
  // strings, so an equal field from the next profile load doesn't repaint
  const variables = JSON.stringify(fieldVariables(spots, field.strength))
  const moving = position.mode === 'moving' ? position.speed : null

  useEffect(() => {
    if (!enabled) return
    const root = document.documentElement
    const painted: Record<string, string> = JSON.parse(variables)
    for (const [name, value] of Object.entries(painted)) root.style.setProperty(name, value)
    if (moving) root.dataset.glassMoving = moving
    return () => {
      for (const name of Object.keys(painted)) root.style.removeProperty(name)
      delete root.dataset.glassMoving
    }
  }, [enabled, variables, moving])

  useEffect(() => {
    if (!enabled || !moving) return
    return keepMotionInStep()
  }, [enabled, moving])
}
