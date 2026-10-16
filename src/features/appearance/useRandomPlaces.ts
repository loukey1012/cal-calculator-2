import { useEffect, useState } from 'react'
import { z } from 'zod'
import { MAX_SPOTS, nextPlaces, type GlassField, type Place } from './glassField'

export const RANDOM_PLACES_KEY = 'calculator-glass-places'

const share = z.number().min(0).max(1)
const rememberedSchema = z.object({
  /** the placed positions the walk started from; moving a spot starts it over */
  from: z.string(),
  places: z.array(z.object({ x: share, y: share })).length(MAX_SPOTS),
})
type Walk = z.infer<typeof rememberedSchema> & { readonly steps: number }

function readRemembered(from: string): Place[] | null {
  try {
    const parsed = rememberedSchema.safeParse(
      JSON.parse(localStorage.getItem(RANDOM_PLACES_KEY) ?? 'null'),
    )
    return parsed.success && parsed.data.from === from ? parsed.data.places : null
  } catch {
    // unreadable or blocked storage: start from where the spots are placed
    return null
  }
}

function remember({ from, places }: Walk): void {
  try {
    localStorage.setItem(RANDOM_PLACES_KEY, JSON.stringify({ from, places }))
  } catch {
    // private browsing or full storage: the next start begins from the placed spots
  }
}

/**
 * Position › Random: where the spots are now. Each change (a tab change, or the app start) moves
 * them a little from where they were (nextPlaces), starting from where they are placed. The last
 * places are remembered on this device, so the next start carries on from there; the setting
 * itself stays on the account. Undefined while the position isn't random.
 */
export function useRandomPlaces(
  field: GlassField,
  tabChanges: number,
  seed: number,
): readonly Place[] | undefined {
  const isRandom = field.position.mode === 'random'
  const placed = field.spots.map(({ x, y }) => ({ x, y }))
  const from = JSON.stringify(placed)
  const steps = field.position.randomOn === 'tab' ? tabChanges : 0
  const [walk, setWalk] = useState<Walk | null>(null)

  // one step per change (adjusted while rendering, like the tab counter in useGlassField)
  if (isRandom && (walk?.from !== from || walk.steps !== steps)) {
    const start = walk?.from === from ? walk.places : (readRemembered(from) ?? placed)
    setWalk({ from, steps, places: nextPlaces(start, seed + steps) })
  }

  useEffect(() => {
    if (walk) remember(walk)
  }, [walk])

  return isRandom ? walk?.places : undefined
}
