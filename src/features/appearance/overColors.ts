import { z } from 'zod'
import type { GoalProgress, RingKey } from '../nutrition/goals'

/**
 * Rings and bars that are full or over: calories, carbs and fat change color (more protein or
 * fiber is fine). From 100 % up to 110 % they take the first color, above that the second. Saved to
 * the account in profiles.appearance.overColors; painted as --goal-over-full / --goal-over-well.
 */

const OVER_PRESETS = ['signal', 'ember', 'neon'] as const
type OverPreset = (typeof OVER_PRESETS)[number]
export const OVER_MODES = ['off', ...OVER_PRESETS, 'custom'] as const
export type OverMode = (typeof OVER_MODES)[number]

export type OverColorPair = { readonly full: string; readonly well: string }

export type OverColors = OverColorPair & {
  readonly mode: OverMode
}

export const OVER_PRESET_COLORS: Record<OverPreset, OverColorPair> = {
  signal: { full: '#f5a524', well: '#e5484d' },
  ember: { full: '#ff8a3d', well: '#c4162a' },
  neon: { full: '#a855f7', well: '#ec4899' },
}

export const DEFAULT_OVER_COLORS: OverColors = { mode: 'signal', ...OVER_PRESET_COLORS.signal }

/** Only these change: for them, over the goal is too much. */
const OVER_RING_KEYS: readonly RingKey[] = ['kcal', 'carbs', 'fat']
/** Above this share of the goal, a ring is "well over" (the second color). */
export const WELL_OVER_RATIO = 1.1

type OverLevel = 'none' | 'full' | 'well'

export function overLevel(goal: GoalProgress): OverLevel {
  if (!OVER_RING_KEYS.includes(goal.key)) return 'none'
  if (goal.ratio > WELL_OVER_RATIO) return 'well'
  return goal.ratio >= 1 ? 'full' : 'none'
}

const hex = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i)
  .transform((color) => color.toLowerCase())

// every field falls back on its own
const overColorsSchema = z
  .object({
    mode: z.enum(OVER_MODES).catch(DEFAULT_OVER_COLORS.mode),
    full: hex.catch(DEFAULT_OVER_COLORS.full),
    well: hex.catch(DEFAULT_OVER_COLORS.well),
  })
  .catch(DEFAULT_OVER_COLORS)

export function parseOverColors(value: unknown): OverColors {
  return overColorsSchema.parse(value ?? {})
}

/** The two colors to paint, or null when the over colors are off. */
export function overColorPair(over: OverColors): OverColorPair | null {
  if (over.mode === 'off') return null
  if (over.mode === 'custom') return { full: over.full, well: over.well }
  return OVER_PRESET_COLORS[over.mode]
}
