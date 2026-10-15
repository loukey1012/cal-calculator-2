import { describe, expect, test } from 'vitest'
import { contrastRatio } from '../../lib/color'
import {
  DEFAULT_GLASS_FIELD,
  fieldSpots,
  fieldVariables,
  parseGlassField,
  type FieldContext,
  type GlassField,
} from './glassField'

const RING = { kcal: '#ff375f', fat: '#2f9bd6', fiber: '#8e5bd6' }
const context = (overrides: Partial<FieldContext> = {}): FieldContext => ({
  ring: RING,
  seed: 1,
  progress: null,
  ...overrides,
})
const field = (overrides: Partial<GlassField>): GlassField => ({
  ...DEFAULT_GLASS_FIELD,
  ...overrides,
})

describe('parseGlassField', () => {
  test('starts with the style colors, changing on tab changes, no drift', () => {
    expect(parseGlassField(undefined)).toEqual(DEFAULT_GLASS_FIELD)
    expect(DEFAULT_GLASS_FIELD).toMatchObject({ mode: 'style', changeOn: 'tab', drift: false })
  })

  test('keeps valid choices and replaces only what is invalid', () => {
    const parsed = parseGlassField({
      mode: 'cycle',
      palette: ['#FF0000', '#00ff00', 'red'],
      strength: 3,
      drift: true,
    })

    expect(parsed.mode).toBe('cycle')
    expect(parsed.drift).toBe(true)
    // an invalid color drops the whole palette back to the default one
    expect(parsed.palette).toEqual(DEFAULT_GLASS_FIELD.palette)
    expect(parsed.strength).toBe(DEFAULT_GLASS_FIELD.strength)
  })

  test('custom spots: 2 to 4, positions inside the screen', () => {
    const spots = [
      { color: '#FF0000', x: 0.1, y: 0.2, size: 0.5 },
      { color: '#00ff00', x: 0.9, y: 0.8, size: 0.6 },
    ]
    expect(parseGlassField({ spots }).spots).toEqual([
      { color: '#ff0000', x: 0.1, y: 0.2, size: 0.5 },
      { color: '#00ff00', x: 0.9, y: 0.8, size: 0.6 },
    ])
    expect(parseGlassField({ spots: spots.slice(0, 1) }).spots).toEqual(DEFAULT_GLASS_FIELD.spots)
    expect(parseGlassField({ spots: [{ ...spots[0], x: 2 }, spots[1]] }).spots).toEqual(
      DEFAULT_GLASS_FIELD.spots,
    )
  })
})

describe('fieldSpots', () => {
  test('style: three spots in the style’s ring colors', () => {
    expect(fieldSpots(field({ mode: 'style' }), context()).map(({ color }) => color)).toEqual([
      RING.kcal,
      RING.fat,
      RING.fiber,
    ])
  })

  test('custom: the spots as saved', () => {
    const spots = [
      { color: '#123456', x: 0.2, y: 0.3, size: 0.4 },
      { color: '#abcdef', x: 0.7, y: 0.6, size: 0.8 },
    ]

    expect(fieldSpots(field({ mode: 'custom', spots }), context())).toEqual(spots)
  })

  test('random: the same seed gives the same field, a new seed a different one', () => {
    const random = field({ mode: 'random' })
    const first = fieldSpots(random, context({ seed: 7 }))

    expect(fieldSpots(random, context({ seed: 7 }))).toEqual(first)
    expect(fieldSpots(random, context({ seed: 8 }))).not.toEqual(first)
    for (const spot of first) {
      expect(spot.color).toMatch(/^#[0-9a-f]{6}$/)
      expect(spot.x).toBeGreaterThanOrEqual(0)
      expect(spot.x).toBeLessThanOrEqual(1)
    }
  })

  test('cycle: each change moves on to the next colors of the palette', () => {
    const cycle = field({ mode: 'cycle', palette: ['#111111', '#222222', '#333333', '#444444'] })
    const colors = (seed: number) => fieldSpots(cycle, context({ seed })).map(({ color }) => color)

    expect(colors(0)).toEqual(['#111111', '#222222', '#333333'])
    expect(colors(1)).toEqual(['#222222', '#333333', '#444444'])
    expect(colors(3)).toEqual(['#444444', '#111111', '#222222'])
  })

  test('goal-aware: calm early, warmer near the goal, red over it', () => {
    const goal = field({ mode: 'goal' })
    const first = (progress: number) => fieldSpots(goal, context({ progress }))[0]?.color ?? ''
    const red = '#ff0000'

    // further from red early in the day than near the goal
    expect(contrastRatio(first(0.1), red)).toBeGreaterThan(contrastRatio(first(0.95), red))
    expect(first(1.3)).not.toBe(first(0.95))
    // no goal set: the style colors
    expect(fieldSpots(goal, context({ progress: null }))[0]?.color).toBe(RING.kcal)
  })
})

describe('fieldVariables', () => {
  test('one set of variables per spot; unused spots are transparent', () => {
    const vars = fieldVariables([{ color: '#123456', x: 0.25, y: 0.5, size: 0.6 }], 0.4)

    expect(vars).toMatchObject({
      '--gf-c1': '#123456',
      '--gf-x1': '25%',
      '--gf-y1': '50%',
      '--gf-s1': '60%',
      '--gf-c2': 'transparent',
      '--gf-c4': 'transparent',
      '--glass-field-strength': '40%',
    })
  })
})
