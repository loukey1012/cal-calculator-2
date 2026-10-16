import { z } from 'zod'

/**
 * The color background behind Liquid Glass Full: 1–6 soft color spots, set by three independent
 * choices: how many (count), where they sit (position: where you placed them, random places, or
 * wandering on their own) and their colors (each spot's own, a preset palette, the next colors of
 * your list, or random). Saved to the account in profiles.appearance.glassField; painted through
 * CSS variables (index.css, useGlassField).
 */

export const POSITION_MODES = ['specified', 'random', 'moving'] as const
export type PositionMode = (typeof POSITION_MODES)[number]
export const MOVE_SPEEDS = ['slow', 'medium', 'fast'] as const
export type MoveSpeed = (typeof MOVE_SPEEDS)[number]
export const COLOR_MODES = ['custom', 'preset', 'cycle', 'random'] as const
export type ColorMode = (typeof COLOR_MODES)[number]
export const FIELD_PRESETS = ['style', 'sunset', 'ocean', 'forest', 'candy'] as const
export type FieldPreset = (typeof FIELD_PRESETS)[number]
export const FIELD_CHANGES = ['tab', 'start'] as const
export type FieldChange = (typeof FIELD_CHANGES)[number]

export const MIN_SPOTS = 1
export const MAX_SPOTS = 6
export const MIN_PALETTE = 2
export const MAX_PALETTE = 8
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

export type FieldPosition = {
  readonly mode: PositionMode
  /** random: new places on every tab change, or once per app start */
  readonly randomOn: FieldChange
  /** moving: how fast the spots wander */
  readonly speed: MoveSpeed
}

export type FieldColors = {
  readonly mode: ColorMode
  readonly preset: FieldPreset
  /** cycle: the colors it moves through */
  readonly palette: string[]
  /** cycle and random: new colors on every tab change, or once per app start */
  readonly changeOn: FieldChange
}

export type GlassField = {
  /** how many spots are painted, 1–6 */
  readonly count: number
  /** always six: places (specified, and where moving starts), colors (custom), sizes */
  readonly spots: Spot[]
  readonly position: FieldPosition
  readonly colors: FieldColors
  /** how strongly the spots show, 0.2–0.8 */
  readonly strength: number
}

const DEFAULT_SPOTS: readonly Spot[] = [
  { color: '#ff7a9a', x: 0.15, y: 0.1, size: 0.6 },
  { color: '#6ec1ff', x: 0.9, y: 0.3, size: 0.55 },
  { color: '#b49cff', x: 0.4, y: 0.95, size: 0.7 },
  { color: '#ffb86b', x: 0.85, y: 0.75, size: 0.5 },
  { color: '#6ee7b7', x: 0.1, y: 0.6, size: 0.5 },
  { color: '#ffe066', x: 0.6, y: 0.45, size: 0.45 },
]

export const DEFAULT_GLASS_FIELD: GlassField = {
  count: 3,
  spots: [...DEFAULT_SPOTS],
  position: { mode: 'specified', randomOn: 'tab', speed: 'medium' },
  colors: {
    mode: 'preset',
    preset: 'style',
    palette: ['#ff7a9a', '#ffb86b', '#ffe066', '#6ee7b7', '#6ec1ff', '#b49cff'],
    changeOn: 'tab',
  },
  strength: 0.5,
}

const PRESET_PALETTES: Record<Exclude<FieldPreset, 'style'>, readonly string[]> = {
  sunset: ['#ff5e62', '#ff9966', '#ffc371', '#f857a6', '#a259ff', '#ffd29d'],
  ocean: ['#00c6ff', '#0072ff', '#36d1dc', '#5b86e5', '#4facfe', '#00e0c6'],
  forest: ['#56ab2f', '#a8e063', '#2f9e79', '#9bc53d', '#3b8d5a', '#c3e88d'],
  candy: ['#ff9a9e', '#fad0c4', '#a18cd1', '#fbc2eb', '#84fab0', '#8fd3f4'],
}

export type RingColors = { readonly kcal: string; readonly fat: string; readonly fiber: string }

/** The ring colors as the app paints them (useAppearance), for the style preset. */
export const PAINTED_RING: RingColors = {
  kcal: 'var(--goal-kcal)',
  fat: 'var(--goal-fat)',
  fiber: 'var(--goal-fiber)',
}

/** A preset's colors; the style preset is the style's three ring colors. */
export function presetColors(preset: FieldPreset, ring: RingColors): readonly string[] {
  return preset === 'style' ? [ring.kcal, ring.fat, ring.fiber] : PRESET_PALETTES[preset]
}

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

const { position: DEFAULT_POSITION, colors: DEFAULT_COLORS } = DEFAULT_GLASS_FIELD

// every field falls back on its own, so one bad value never resets the others
const glassFieldSchema = z.object({
  count: z.number().int().min(MIN_SPOTS).max(MAX_SPOTS).catch(DEFAULT_GLASS_FIELD.count),
  spots: z
    .array(spotSchema)
    .min(MIN_SPOTS)
    .max(MAX_SPOTS)
    .catch([...DEFAULT_SPOTS])
    // the spots beyond the saved ones keep their default places, colors and sizes
    .transform((spots) => [...spots, ...DEFAULT_SPOTS.slice(spots.length)]),
  position: z
    .object({
      mode: z.enum(POSITION_MODES).catch(DEFAULT_POSITION.mode),
      randomOn: z.enum(FIELD_CHANGES).catch(DEFAULT_POSITION.randomOn),
      speed: z.enum(MOVE_SPEEDS).catch(DEFAULT_POSITION.speed),
    })
    .catch(DEFAULT_POSITION),
  colors: z
    .object({
      mode: z.enum(COLOR_MODES).catch(DEFAULT_COLORS.mode),
      preset: z.enum(FIELD_PRESETS).catch(DEFAULT_COLORS.preset),
      palette: z
        .array(hex)
        .min(MIN_PALETTE)
        .max(MAX_PALETTE)
        .catch([...DEFAULT_COLORS.palette]),
      changeOn: z.enum(FIELD_CHANGES).catch(DEFAULT_COLORS.changeOn),
    })
    .catch({ ...DEFAULT_COLORS, palette: [...DEFAULT_COLORS.palette] }),
  strength: z.number().min(MIN_STRENGTH).max(MAX_STRENGTH).catch(DEFAULT_GLASS_FIELD.strength),
})

// before 2026-10-16 one mode decided everything: style | custom | random | cycle | goal
const OLD_COLOR_MODES: Partial<Record<string, ColorMode>> = {
  custom: 'custom',
  random: 'random',
  cycle: 'cycle',
}

/** Maps a background saved with the old single mode onto count, position and colors. */
function fromOldShape(value: Record<string, unknown>): Record<string, unknown> {
  const { mode, spots, palette, changeOn, strength } = value
  const custom = mode === 'custom' && Array.isArray(spots)
  return {
    count: custom ? spots.length : DEFAULT_GLASS_FIELD.count,
    spots: custom ? spots : undefined,
    position: { mode: mode === 'random' ? 'random' : 'specified', randomOn: changeOn },
    colors: {
      mode: OLD_COLOR_MODES[String(mode)] ?? 'preset',
      preset: 'style',
      palette,
      changeOn,
    },
    strength,
  }
}

export function parseGlassField(value: unknown): GlassField {
  const saved =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  const isOldShape = 'mode' in saved && !('colors' in saved)
  return glassFieldSchema.parse(isOldShape ? fromOldShape(saved) : saved)
}

export type FieldContext = {
  readonly ring: RingColors
  /** a new number for each change of random places (tab change or app start) */
  readonly positionSeed: number
  /** a new number for each change of cycle or random colors (tab change or app start) */
  readonly colorSeed: number
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

// so random colors and random places from the same seed don't follow each other
const COLOR_SEED_SALT = 0x5f3759df

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

const hundredths = (value: number) => Math.round(value * 100) / 100

/** `count` colors from a list, starting at `start` and wrapping around. */
function takeColors(list: readonly string[], start: number, count: number): string[] {
  const offset = ((Math.trunc(start) % list.length) + list.length) % list.length
  return Array.from({ length: count }, (_, index) => list[(offset + index) % list.length] ?? '')
}

function spotColors(field: GlassField, context: FieldContext): string[] {
  const { colors, count } = field
  switch (colors.mode) {
    case 'custom':
      return field.spots.slice(0, count).map(({ color }) => color)
    case 'preset':
      return takeColors(presetColors(colors.preset, context.ring), 0, count)
    case 'cycle':
      return takeColors(colors.palette, context.colorSeed, count)
    case 'random': {
      const random = randomFrom(context.colorSeed ^ COLOR_SEED_SALT)
      return Array.from({ length: count }, () => hslHex(Math.floor(random() * 360), 75, 62))
    }
  }
}

/** The spots to paint: the chosen number, at their places, in their colors. */
export function fieldSpots(field: GlassField, context: FieldContext): Spot[] {
  const spots = field.spots.slice(0, field.count)
  const colors = spotColors(field, context)
  const random = randomFrom(context.positionSeed)
  return spots.map((spot, index) => ({
    ...spot,
    ...(field.position.mode === 'random' && { x: hundredths(random()), y: hundredths(random()) }),
    color: colors[index] ?? spot.color,
  }))
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
