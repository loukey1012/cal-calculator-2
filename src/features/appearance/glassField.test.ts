import { describe, expect, test } from 'vitest'
import {
  DEFAULT_GLASS_FIELD,
  MAX_SPOTS,
  fieldSpots,
  fieldVariables,
  nextPlaces,
  parseGlassField,
  RANDOM_STEP,
  presetColors,
  type FieldContext,
  type GlassField,
} from './glassField'

const RING = { kcal: '#ff375f', fat: '#2f9bd6', fiber: '#8e5bd6' }
const context = (overrides: Partial<FieldContext> = {}): FieldContext => ({
  ring: RING,
  colorSeed: 1,
  ...overrides,
})
const field = (overrides: {
  count?: number
  spots?: GlassField['spots']
  position?: Partial<GlassField['position']>
  colors?: Partial<GlassField['colors']>
}): GlassField => ({
  ...DEFAULT_GLASS_FIELD,
  ...overrides,
  position: { ...DEFAULT_GLASS_FIELD.position, ...overrides.position },
  colors: { ...DEFAULT_GLASS_FIELD.colors, ...overrides.colors },
})
const colorsOf = (spots: readonly { color: string }[]) => spots.map(({ color }) => color)
const placesOf = (spots: readonly { x: number; y: number }[]) => spots.map(({ x, y }) => [x, y])

describe('parseGlassField', () => {
  test('starts with three spots where they belong, in the style’s ring colors', () => {
    expect(parseGlassField(undefined)).toEqual(DEFAULT_GLASS_FIELD)
    expect(DEFAULT_GLASS_FIELD).toMatchObject({
      count: 3,
      position: { mode: 'specified', randomOn: 'tab', speed: 'medium' },
      colors: { mode: 'preset', preset: 'style', changeOn: 'tab' },
      strength: 0.5,
    })
    expect(DEFAULT_GLASS_FIELD.spots).toHaveLength(MAX_SPOTS)
  })

  test('keeps valid choices and replaces only what is invalid', () => {
    const parsed = parseGlassField({
      count: 9,
      position: { mode: 'moving', speed: 'warp' },
      colors: { mode: 'cycle', palette: ['#FF0000', '#00ff00', 'red'] },
      strength: 3,
    })

    expect(parsed.count).toBe(DEFAULT_GLASS_FIELD.count)
    expect(parsed.position).toEqual({ mode: 'moving', randomOn: 'tab', speed: 'medium' })
    expect(parsed.colors.mode).toBe('cycle')
    // an invalid color drops the whole palette back to the default one
    expect(parsed.colors.palette).toEqual(DEFAULT_GLASS_FIELD.colors.palette)
    expect(parsed.strength).toBe(DEFAULT_GLASS_FIELD.strength)
  })

  test('spots: lowercased, positions inside the screen, always six to choose from', () => {
    const spots = [
      { color: '#FF0000', x: 0.1, y: 0.2, size: 0.5 },
      { color: '#00ff00', x: 0.9, y: 0.8, size: 0.6 },
    ]
    const parsed = parseGlassField({ spots }).spots

    expect(parsed).toHaveLength(MAX_SPOTS)
    expect(parsed.slice(0, 2)).toEqual([
      { color: '#ff0000', x: 0.1, y: 0.2, size: 0.5 },
      { color: '#00ff00', x: 0.9, y: 0.8, size: 0.6 },
    ])
    expect(parsed.slice(2)).toEqual(DEFAULT_GLASS_FIELD.spots.slice(2))
    expect(parseGlassField({ spots: [{ ...spots[0], x: 2 }] }).spots).toEqual(
      DEFAULT_GLASS_FIELD.spots,
    )
  })

  describe('a background saved before position and colors were separate', () => {
    const spots = [
      { color: '#123456', x: 0.2, y: 0.3, size: 0.4 },
      { color: '#abcdef', x: 0.7, y: 0.6, size: 0.8 },
    ]

    test('style colors (and goal-aware) become the style preset where the spots belong', () => {
      for (const mode of ['style', 'goal']) {
        expect(parseGlassField({ mode, strength: 0.7, drift: true })).toEqual({
          ...DEFAULT_GLASS_FIELD,
          strength: 0.7,
        })
      }
    })

    test('custom keeps its spots, their number and colors', () => {
      const parsed = parseGlassField({ mode: 'custom', spots })

      expect(parsed.count).toBe(2)
      expect(parsed.spots.slice(0, 2)).toEqual(spots)
      expect(parsed.position.mode).toBe('specified')
      expect(parsed.colors.mode).toBe('custom')
    })

    test('random becomes random places and colors, changing when it did', () => {
      const parsed = parseGlassField({ mode: 'random', changeOn: 'start' })

      expect(parsed.position).toMatchObject({ mode: 'random', randomOn: 'start' })
      expect(parsed.colors).toMatchObject({ mode: 'random', changeOn: 'start' })
    })

    test('cycle keeps its colors and when they change', () => {
      const palette = ['#111111', '#222222']
      const parsed = parseGlassField({ mode: 'cycle', palette, changeOn: 'start' })

      expect(parsed.position.mode).toBe('specified')
      expect(parsed.colors).toMatchObject({ mode: 'cycle', palette, changeOn: 'start' })
    })
  })
})

describe('fieldSpots', () => {
  test('paints as many spots as chosen', () => {
    for (const count of [1, 4, 6]) {
      expect(fieldSpots(field({ count }), context())).toHaveLength(count)
    }
  })

  describe('position', () => {
    test('specified: where the spots were placed, with their sizes', () => {
      const spots = fieldSpots(field({ count: 2 }), context())

      expect(spots.map(({ x, y, size }) => ({ x, y, size }))).toEqual(
        DEFAULT_GLASS_FIELD.spots.slice(0, 2).map(({ x, y, size }) => ({ x, y, size })),
      )
    })

    test('random: at the current random places, with their sizes', () => {
      const places = [
        { x: 0.3, y: 0.4 },
        { x: 0.6, y: 0.7 },
      ]
      const spots = fieldSpots(
        field({ count: 2, position: { mode: 'random' } }),
        context({ places }),
      )

      expect(placesOf(spots)).toEqual([
        [0.3, 0.4],
        [0.6, 0.7],
      ])
      expect(spots.map(({ size }) => size)).toEqual(
        DEFAULT_GLASS_FIELD.spots.slice(0, 2).map(({ size }) => size),
      )
      // until there are random places: where the spots were placed
      expect(placesOf(fieldSpots(field({ position: { mode: 'random' } }), context()))).toEqual(
        placesOf(fieldSpots(field({}), context())),
      )
    })

    test('specified ignores random places', () => {
      const spots = fieldSpots(field({ count: 1 }), context({ places: [{ x: 0.9, y: 0.9 }] }))

      expect(placesOf(spots)).toEqual([
        [DEFAULT_GLASS_FIELD.spots[0]?.x, DEFAULT_GLASS_FIELD.spots[0]?.y],
      ])
    })

    test('moving: starts from where the spots were placed (the motion is CSS)', () => {
      const moving = field({ position: { mode: 'moving' } })

      expect(placesOf(fieldSpots(moving, context()))).toEqual(
        placesOf(fieldSpots(field({}), context())),
      )
    })
  })

  describe('colors', () => {
    test('custom: each spot’s own color', () => {
      const spots = fieldSpots(field({ count: 2, colors: { mode: 'custom' } }), context())

      expect(colorsOf(spots)).toEqual(colorsOf(DEFAULT_GLASS_FIELD.spots.slice(0, 2)))
    })

    test('preset: the style’s ring colors, repeating for more spots than colors', () => {
      const spots = fieldSpots(field({ count: 4 }), context())

      expect(colorsOf(spots)).toEqual([RING.kcal, RING.fat, RING.fiber, RING.kcal])
    })

    test('preset: a named palette', () => {
      const spots = fieldSpots(field({ count: 2, colors: { preset: 'ocean' } }), context())

      expect(colorsOf(spots)).toEqual(presetColors('ocean', RING).slice(0, 2))
    })

    test('cycle: each change moves on to the next colors of the list', () => {
      const cycle = field({
        colors: { mode: 'cycle', palette: ['#111111', '#222222', '#333333', '#444444'] },
      })
      const colors = (colorSeed: number) => colorsOf(fieldSpots(cycle, context({ colorSeed })))

      expect(colors(0)).toEqual(['#111111', '#222222', '#333333'])
      expect(colors(1)).toEqual(['#222222', '#333333', '#444444'])
      expect(colors(3)).toEqual(['#444444', '#111111', '#222222'])
    })

    test('random: the same seed gives the same colors, a new one others; places stay', () => {
      const random = field({ colors: { mode: 'random' } })
      const first = fieldSpots(random, context({ colorSeed: 7 }))

      expect(fieldSpots(random, context({ colorSeed: 7 }))).toEqual(first)
      expect(colorsOf(fieldSpots(random, context({ colorSeed: 8 })))).not.toEqual(colorsOf(first))
      expect(placesOf(first)).toEqual(placesOf(fieldSpots(field({}), context())))
      for (const spot of first) expect(spot.color).toMatch(/^#[0-9a-f]{6}$/)
    })
  })
})

describe('nextPlaces', () => {
  const places = DEFAULT_GLASS_FIELD.spots.map(({ x, y }) => ({ x, y }))

  test('moves every spot only a little from where it was', () => {
    for (const seed of [1, 2, 3, 99]) {
      nextPlaces(places, seed).forEach((place, index) => {
        expect(Math.abs(place.x - (places[index]?.x ?? 0))).toBeLessThanOrEqual(RANDOM_STEP + 0.005)
        expect(Math.abs(place.y - (places[index]?.y ?? 0))).toBeLessThanOrEqual(RANDOM_STEP + 0.005)
      })
    }
    expect(RANDOM_STEP).toBe(0.15)
  })

  test('the same seed gives the same step, a new one another', () => {
    expect(nextPlaces(places, 5)).toEqual(nextPlaces(places, 5))
    expect(nextPlaces(places, 5)).not.toEqual(nextPlaces(places, 6))
  })

  test('never leaves the screen, even after many steps from an edge', () => {
    let current = [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
    ]
    for (let seed = 0; seed < 200; seed += 1) {
      current = nextPlaces(current, seed)
      for (const { x, y } of current) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(1)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('presetColors', () => {
  test('every palette has a color for each of the six spots, except the style’s three rings', () => {
    expect(presetColors('style', RING)).toEqual([RING.kcal, RING.fat, RING.fiber])
    for (const preset of ['sunset', 'ocean', 'forest', 'candy'] as const) {
      expect(presetColors(preset, RING)).toHaveLength(MAX_SPOTS)
    }
  })
})

describe('fieldVariables', () => {
  test('one set of variables per spot, up to six; unused spots are transparent', () => {
    const vars = fieldVariables([{ color: '#123456', x: 0.25, y: 0.5, size: 0.6 }], 0.4)

    expect(vars).toMatchObject({
      '--gf-c1': '#123456',
      '--gf-x1': '25%',
      '--gf-y1': '50%',
      '--gf-s1': '60%',
      '--gf-c2': 'transparent',
      '--gf-c6': 'transparent',
      '--glass-field-strength': '40%',
    })
  })
})
