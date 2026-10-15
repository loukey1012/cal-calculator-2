import { z } from 'zod'
import { mixHex } from '../../lib/color'

/**
 * The color background behind Liquid Glass Full: up to four soft color spots. The modes decide
 * the spots: the style's ring colors, your own (custom), random ones, the next colors of your
 * palette (cycle) or colors that follow today's calories (goal-aware). Saved to the account in
 * profiles.appearance.glassField; painted through CSS variables (index.css, useGlassField).
 */

export const FIELD_MODES = ['style', 'custom', 'random', 'cycle', 'goal'] as const
export type FieldMode = (typeof FIELD_MODES)[number]
export const FIELD_CHANGES = ['tab', 'start'] as const
export type FieldChange = (typeof FIELD_CHANGES)[number]

export const MAX_SPOTS = 4
export const MIN_SPOTS = 2
export const MIN_STRENGTH = 0.2
export const MAX_STRENGTH = 0.8
export const MIN_SPOT_SIZE = 0.2

export type Spot = {
  readonly color: string
  /** 0 = left / top edge, 1 = right / bottom edge */
  readonly x: number
  readonly y: number
  /** the spot's radius as a share of the screen */
  readonly size: number
}

/** Where the style, cycle and goal-aware spots sit: top left, right, bottom. */
const SPOT_PLACES = [
  { x: 0.15, y: 0.1, size: 0.6 },
  { x: 0.9, y: 0.3, size: 0.55 },
  { x: 0.4, y: 0.95, size: 0.7 },
] as const

const hex = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i)
  .transform((color) => color.toLowerCase())
const share = z.number().min(0).max(1)
const spotSchema = z.object({
  color: hex,
  x: share,
  y: share,
  size: z.number().min(MIN_SPOT_SIZE).max(1),
})

export type GlassField = {
  readonly mode: FieldMode
  /** custom: 2–4 spots */
  readonly spots: Spot[]
  /** cycle: the colors it moves through */
  readonly palette: string[]
  /** random and cycle: new colors on every tab change, or once per app start */
  readonly changeOn: FieldChange
  /** how strongly the spots show, 0.2–0.8 */
  readonly strength: number
  /** the spots float slowly */
  readonly drift: boolean
}

export const DEFAULT_GLASS_FIELD: GlassField = {
  mode: 'style',
  spots: [
    { color: '#ff7a9a', ...SPOT_PLACES[0] },
    { color: '#6ec1ff', ...SPOT_PLACES[1] },
    { color: '#b49cff', ...SPOT_PLACES[2] },
  ],
  palette: ['#ff7a9a', '#ffb86b', '#ffe066', '#6ee7b7', '#6ec1ff', '#b49cff'],
  changeOn: 'tab',
  strength: 0.5,
  drift: false,
}

// every field falls back on its own, so one bad value never resets the others
const glassFieldSchema = z
  .object({
    mode: z.enum(FIELD_MODES).catch(DEFAULT_GLASS_FIELD.mode),
    spots: z
      .array(spotSchema)
      .min(MIN_SPOTS)
      .max(MAX_SPOTS)
      .catch([...DEFAULT_GLASS_FIELD.spots]),
    palette: z
      .array(hex)
      .min(MIN_SPOTS)
      .max(8)
      .catch([...DEFAULT_GLASS_FIELD.palette]),
    changeOn: z.enum(FIELD_CHANGES).catch(DEFAULT_GLASS_FIELD.changeOn),
    strength: z.number().min(MIN_STRENGTH).max(MAX_STRENGTH).catch(DEFAULT_GLASS_FIELD.strength),
    drift: z.boolean().catch(DEFAULT_GLASS_FIELD.drift),
  })
  .catch({
    ...DEFAULT_GLASS_FIELD,
    spots: [...DEFAULT_GLASS_FIELD.spots],
    palette: [...DEFAULT_GLASS_FIELD.palette],
  })

export function parseGlassField(value: unknown): GlassField {
  return glassFieldSchema.parse(value ?? {})
}

export type FieldContext = {
  /** the style's ring colors */
  readonly ring: { readonly kcal: string; readonly fat: string; readonly fiber: string }
  /** a new number for each change (tab change or app start), for random and cycle */
  readonly seed: number
  /** today's calories as a share of the goal; null without a goal */
  readonly progress: number | null
}

/** A small, repeatable random number source: the same seed gives the same field. */
function randomFrom(seed: number): () => number {
  let state = Math.trunc(seed) >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hslHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100
  const l = lightness / 100
  const k = (n: number) => (n + hue / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number) => {
    const value = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(0)}${channel(8)}${channel(4)}`
}

const placed = (colors: readonly string[]): Spot[] =>
  SPOT_PLACES.map((place, index) => ({ ...place, color: colors[index] ?? colors[0] ?? '#ffffff' }))

const CALM = ['#4fd1c5', '#63b3ed', '#9f7aea'] as const
const WARM = ['#f6ad55', '#f6e05e', '#fc8181'] as const
const OVER = ['#f56565', '#ed8936', '#e53e3e'] as const
// calm until a third of the goal, fully warm at the goal
const WARM_FROM = 0.3

function goalColors(progress: number): readonly string[] {
  if (progress > 1) return OVER
  const warmth = Math.min(1, Math.max(0, (progress - WARM_FROM) / (1 - WARM_FROM)))
  return CALM.map((calm, index) => mixHex(calm, WARM[index] ?? calm, warmth))
}

function randomSpots(seed: number): Spot[] {
  const random = randomFrom(seed)
  return SPOT_PLACES.map(() => ({
    color: hslHex(Math.floor(random() * 360), 75, 62),
    x: Math.round(random() * 100) / 100,
    y: Math.round(random() * 100) / 100,
    size: 0.45 + Math.round(random() * 30) / 100,
  }))
}

/** The spots to paint for the chosen mode. */
export function fieldSpots(field: GlassField, context: FieldContext): Spot[] {
  const { ring, seed, progress } = context
  switch (field.mode) {
    case 'custom':
      return [...field.spots]
    case 'random':
      return randomSpots(seed)
    case 'cycle': {
      const { palette } = field
      const start = ((Math.trunc(seed) % palette.length) + palette.length) % palette.length
      return placed(SPOT_PLACES.map((_, index) => palette[(start + index) % palette.length] ?? ''))
    }
    case 'goal':
      if (progress !== null) return placed(goalColors(progress))
      return placed([ring.kcal, ring.fat, ring.fiber])
    case 'style':
      return placed([ring.kcal, ring.fat, ring.fiber])
  }
}

const percent = (share: number) => `${Math.round(share * 1000) / 10}%`

/** The CSS variables index.css paints the field from; spots not in use are transparent. */
export function fieldVariables(spots: readonly Spot[], strength: number): Record<string, string> {
  const variables: Record<string, string> = { '--glass-field-strength': percent(strength) }
  for (let index = 0; index < MAX_SPOTS; index += 1) {
    const spot = spots[index]
    const n = index + 1
    variables[`--gf-c${n}`] = spot?.color ?? 'transparent'
    variables[`--gf-x${n}`] = percent(spot?.x ?? 0.5)
    variables[`--gf-y${n}`] = percent(spot?.y ?? 0.5)
    variables[`--gf-s${n}`] = percent(spot?.size ?? 0.5)
  }
  return variables
}

/** The same soft spots as the background behind the glass (index.css), for one element. */
export function fieldBackground(spots: readonly Spot[], strength: number): string {
  const layers = spots.map(
    ({ color, x, y, size }) =>
      `radial-gradient(${size * 100}% ${size * 75}% at ${x * 100}% ${y * 100}%, ` +
      `color-mix(in srgb, ${color} ${Math.round(strength * 100)}%, transparent), transparent 70%)`,
  )
  return [...layers, 'var(--glass-field-base)'].join(', ')
}
