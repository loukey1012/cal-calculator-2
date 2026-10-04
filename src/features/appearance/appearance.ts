import { z } from 'zod'
import { mixHex, onColor, readableInk } from '../../lib/color'

const THEMES = ['system', 'light', 'dark'] as const
const DARK_STYLES = ['soft', 'bento'] as const
const GOAL_PALETTES = ['vivid', 'pastel', 'accent', 'contrast'] as const
const PROGRESS_STYLES = ['rings', 'ringBars', 'bars', 'compact'] as const

export type DarkStyle = (typeof DARK_STYLES)[number]
export type GoalPalette = (typeof GOAL_PALETTES)[number]
export type ProgressStyle = (typeof PROGRESS_STYLES)[number]
/** What is actually painted: light, or one of the two dark styles. */
export type Scheme = 'light' | DarkStyle

export const DEFAULT_APPEARANCE = {
  theme: 'system',
  darkStyle: 'soft',
  goalPalette: 'vivid',
  progressStyle: 'ringBars',
} as const satisfies Record<string, string>

// every field falls back on its own, so one unknown value (e.g. from a newer app version)
// never resets the other choices
const appearanceSchema = z
  .object({
    theme: z.enum(THEMES).catch(DEFAULT_APPEARANCE.theme),
    darkStyle: z.enum(DARK_STYLES).catch(DEFAULT_APPEARANCE.darkStyle),
    goalPalette: z.enum(GOAL_PALETTES).catch(DEFAULT_APPEARANCE.goalPalette),
    progressStyle: z.enum(PROGRESS_STYLES).catch(DEFAULT_APPEARANCE.progressStyle),
  })
  .catch(DEFAULT_APPEARANCE)

export type Appearance = z.infer<typeof appearanceSchema>

/** profiles.appearance is free-form JSON in the database; anything invalid becomes the default. */
export function parseAppearance(value: unknown): Appearance {
  return appearanceSchema.parse(value)
}

export const ACCENT_COLORS = [
  { name: 'Blue', value: '#007aff' },
  { name: 'Indigo', value: '#5b5bd6' },
  { name: 'Violet', value: '#8e4ec6' },
  { name: 'Pink', value: '#d6409f' },
  { name: 'Red', value: '#e5484d' },
  { name: 'Orange', value: '#ef6c1a' },
  { name: 'Amber', value: '#c88a04' },
  { name: 'Green', value: '#30a46c' },
  { name: 'Teal', value: '#12a594' },
  { name: 'Cyan', value: '#0797b9' },
  { name: 'Lime', value: '#c6f432' },
  { name: 'Slate', value: '#64748b' },
] as const

export function resolveScheme(appearance: Appearance, prefersDark: boolean): Scheme {
  const dark = appearance.theme === 'dark' || (appearance.theme === 'system' && prefersDark)
  return dark ? appearance.darkStyle : 'light'
}

/** Page and card colors per scheme; must match the tokens in index.css. */
export const SCHEME_SURFACES: Record<Scheme, { readonly bg: string; readonly card: string }> = {
  light: { bg: '#f3f4f7', card: '#ffffff' },
  soft: { bg: '#0b0c0f', card: '#17191e' },
  bento: { bg: '#0c0c0d', card: '#18181a' },
}

type GoalColors = readonly [kcal: string, protein: string, carbs: string, fat: string]

const FIXED_PALETTES: Record<Exclude<GoalPalette, 'accent'>, Record<Scheme, GoalColors>> = {
  vivid: {
    light: ['#ff375f', '#1f9d6b', '#e8930c', '#2f9bd6'],
    soft: ['#ff5f7e', '#3cc48a', '#f0a63a', '#5ec8f2'],
    bento: ['#ff5f7e', '#5ee0ff', '#ffb547', '#ff7aa8'],
  },
  pastel: {
    light: ['#e5738f', '#5fb48c', '#e0a94f', '#6f9de0'],
    soft: ['#f08aa4', '#7cc9a5', '#f2c27a', '#93b8f0'],
    bento: ['#f08aa4', '#7cc9a5', '#f2c27a', '#93b8f0'],
  },
  contrast: {
    light: ['#d1002f', '#007a3d', '#b35c00', '#0050b3'],
    soft: ['#ff4d6d', '#2ee59d', '#ffb020', '#4db8ff'],
    bento: ['#ff4d6d', '#2ee59d', '#ffb020', '#4db8ff'],
  },
}

// the accent fading towards the card color, ring by ring
const ACCENT_SHADE_WEIGHTS = [0, 0.25, 0.45, 0.6] as const

export function goalColors(palette: GoalPalette, scheme: Scheme, accent: string): GoalColors {
  if (palette !== 'accent') return FIXED_PALETTES[palette][scheme]
  const [kcal, protein, carbs, fat] = ACCENT_SHADE_WEIGHTS.map((weight) =>
    mixHex(accent, SCHEME_SURFACES[scheme].card, weight),
  )
  return [kcal, protein, carbs, fat] as GoalColors
}

/** CSS custom properties that depend on the user's choices (the rest come from the scheme). */
export function appearanceVariables(
  goalPalette: GoalPalette,
  scheme: Scheme,
  accent: string,
): Record<string, string> {
  const { bg, card } = SCHEME_SURFACES[scheme]
  const [kcal, protein, carbs, fat] = goalColors(goalPalette, scheme, accent)
  return {
    '--accent': accent,
    // accent used as text must stay readable on both the page and the cards
    '--accent-ink': readableInk(readableInk(accent, bg), card),
    '--on-accent': onColor(accent),
    '--goal-kcal': kcal,
    '--goal-protein': protein,
    '--goal-carbs': carbs,
    '--goal-fat': fat,
  }
}
