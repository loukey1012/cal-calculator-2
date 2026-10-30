import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { parseAppearance } from './appearance'
import { RANDOM_PLACES_KEY } from './useRandomPlaces'
import { useGlassField } from './useGlassField'

const root = document.documentElement
const variable = (name: string) => root.style.getPropertyValue(name)

const SPOTS = [
  { color: '#123456', x: 0.2, y: 0.3, size: 0.4 },
  { color: '#abcdef', x: 0.7, y: 0.6, size: 0.8 },
]
const CUSTOM = { count: 2, spots: SPOTS, colors: { mode: 'custom' } }

afterEach(() => {
  localStorage.clear()
  root.removeAttribute('style')
  delete root.dataset.glassMoving
})

function render(glassField: object, glass = 'all', tab = 0) {
  return renderHook(
    ({ tab: index }) => useGlassField(parseAppearance({ glass, glassField }), index),
    { initialProps: { tab } },
  )
}

/** A CSS animation as getAnimations() lists it. */
function cssAnimation(animationName: string) {
  return { animationName, startTime: 1234 as number | null }
}

describe('useGlassField', () => {
  test('paints the chosen number of spots and their strength with Liquid Glass Full', () => {
    render({ ...CUSTOM, strength: 0.6 })

    expect(variable('--gf-c1')).toBe('#123456')
    expect(variable('--gf-x2')).toBe('70%')
    expect(variable('--gf-c3')).toBe('transparent')
    expect(variable('--gf-c6')).toBe('transparent')
    expect(variable('--glass-field-strength')).toBe('60%')
  })

  test('the style preset follows the style’s own ring colors', () => {
    render({})

    expect(variable('--gf-c1')).toBe('var(--goal-kcal)')
  })

  test('nothing is painted without Full', () => {
    render(CUSTOM, 'controls')

    expect(variable('--gf-c1')).toBe('')
  })

  test('random colors change on every tab change, unless they should once per start', () => {
    // all three spots: one alone lands on the same of 360 hues now and then
    const colors = () => ['1', '2', '3'].map((n) => variable(`--gf-c${n}`))
    const everyTab = render({ colors: { mode: 'random', changeOn: 'tab' } })
    const before = colors()
    everyTab.rerender({ tab: 1 })
    expect(colors()).not.toEqual(before)
    everyTab.unmount()

    const perStart = render({ colors: { mode: 'random', changeOn: 'start' } })
    const first = variable('--gf-c1')
    perStart.rerender({ tab: 2 })
    expect(variable('--gf-c1')).toBe(first)
  })

  test('random places follow their own choice, independent of the colors', () => {
    const { rerender } = render({
      position: { mode: 'random', randomOn: 'tab' },
      colors: { mode: 'random', changeOn: 'start' },
    })
    // all three spots: one alone may stay put, e.g. pressed against the edge
    const places = () => ['1', '2', '3'].map((n) => variable(`--gf-x${n}`) + variable(`--gf-y${n}`))
    const before = places()
    const color = variable('--gf-c1')

    rerender({ tab: 1 })

    expect(places()).not.toEqual(before)
    expect(variable('--gf-c1')).toBe(color)
  })

  describe('random places', () => {
    const RANDOM = { position: { mode: 'random', randomOn: 'tab' } }
    const x1 = () => parseFloat(variable('--gf-x1'))
    const remembered = () =>
      JSON.parse(localStorage.getItem(RANDOM_PLACES_KEY) ?? 'null') as {
        from: string
        places: Array<{ x: number; y: number }>
      } | null

    test('each tab change moves the spots only a little from where they were', () => {
      const { rerender } = render(RANDOM)
      for (let tab = 1; tab <= 5; tab += 1) {
        const before = x1()
        rerender({ tab })
        expect(Math.abs(x1() - before)).toBeLessThanOrEqual(15.5)
      }
    })

    test('once per app start: a tab change doesn’t move them', () => {
      const { rerender } = render({ position: { mode: 'random', randomOn: 'start' } })
      const first = variable('--gf-x1')

      rerender({ tab: 3 })

      expect(variable('--gf-x1')).toBe(first)
    })

    test('the next app start carries on from where the spots were', () => {
      const first = render(RANDOM)
      const saved = remembered()
      first.unmount()
      expect(saved?.places).toHaveLength(6)
      // pretend the spots had wandered to the far right
      const far = saved?.places.map(() => ({ x: 0.95, y: 0.5 }))
      localStorage.setItem(RANDOM_PLACES_KEY, JSON.stringify({ ...saved, places: far }))

      render(RANDOM)

      expect(x1()).toBeGreaterThanOrEqual(79.5)
    })

    test('after a spot was moved, they start over from where they are placed', () => {
      const far = Array.from({ length: 6 }, () => ({ x: 0.95, y: 0.5 }))
      localStorage.setItem(
        RANDOM_PLACES_KEY,
        JSON.stringify({ from: 'another layout', places: far }),
      )

      render(RANDOM)

      // spot 1 is placed at 15 %
      expect(x1()).toBeLessThanOrEqual(30.5)
    })

    test('a broken remembered value is ignored', () => {
      localStorage.setItem(RANDOM_PLACES_KEY, '{nope')

      render(RANDOM)

      expect(x1()).toBeLessThanOrEqual(30.5)
    })
  })

  test('moving spots get their speed, and everything is removed when signed out', () => {
    const { unmount } = render({ ...CUSTOM, position: { mode: 'moving', speed: 'fast' } })
    expect(root.dataset.glassMoving).toBe('fast')

    unmount()
    expect(root.dataset.glassMoving).toBeUndefined()
    expect(variable('--gf-c1')).toBe('')
  })

  test('spots that stand still have no motion', () => {
    render(CUSTOM)

    expect(root.dataset.glassMoving).toBeUndefined()
  })

  test('moving spots stay in step on every layer: each one starts at the same moment', () => {
    const { unmount } = render({ position: { mode: 'moving' } })
    const layer = document.createElement('div')
    document.body.append(layer)
    const moving = cssAnimation('glass-move-x')
    const other = cssAnimation('fade-in')
    Object.assign(layer, { getAnimations: vi.fn(() => [moving, other]) })

    const event = new Event('animationstart', { bubbles: true })
    Object.assign(event, { animationName: 'glass-move-x' })
    layer.dispatchEvent(event)

    expect(moving.startTime).toBe(0)
    expect(other.startTime).toBe(1234)

    unmount()
    moving.startTime = 99
    layer.dispatchEvent(event)
    expect(moving.startTime).toBe(99)
    layer.remove()
  })
})
