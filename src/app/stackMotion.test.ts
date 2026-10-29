import { describe, expect, test } from 'vitest'
import {
  BACK_PARALLAX,
  dragDirection,
  layerTransforms,
  releaseCompletesBack,
  stackChange,
  startsAtBottomEdge,
} from './stackMotion'

describe('dragDirection', () => {
  test.each([
    ['too small to tell', { dx: 4, dy: 2 }, null],
    ['clearly to the right', { dx: 14, dy: 3 }, 'back'],
    ['mostly down: scrolling', { dx: 6, dy: 14 }, 'other'],
    ['to the left', { dx: -14, dy: 2 }, 'other'],
    ['diagonal, still more sideways', { dx: 14, dy: 10 }, 'back'],
    ['diagonal, too steep', { dx: 12, dy: 12 }, 'other'],
  ] as const)('%s', (_name, move, expected) => {
    expect(dragDirection(move.dx, move.dy)).toBe(expected)
  })
})

describe('releaseCompletesBack', () => {
  const WIDTH = 390

  test.each([
    ['dragged past a third', 140, 0, true],
    ['dragged a little and let go', 60, 0.1, false],
    ['a quick flick', 40, 0.8, true],
    ['a flick back to the left', 200, -0.6, false],
  ])('%s', (_name, dx, velocity, expected) => {
    expect(releaseCompletesBack(dx, WIDTH, velocity)).toBe(expected)
  })
})

describe('stackChange', () => {
  test.each([
    ['/settings', '/settings/appearance', 'push'],
    ['/settings/appearance', '/settings/appearance/colors', 'push'],
    ['/settings/appearance/colors', '/settings/appearance', 'pop'],
    ['/settings/categories', '/settings', 'pop'],
    ['/settings/categories', '/settings/appearance', null],
    ['/settings', '/settings', null],
    // a meal's note page is an ordinary push on top of the meal page, and Back an ordinary pop
    ['/today/meal-dinner-2026-10-21-u1', '/today/meal-dinner-2026-10-21-u1/note', 'push'],
    ['/today/meal-dinner-2026-10-21-u1/note', '/today/meal-dinner-2026-10-21-u1', 'pop'],
    ['/settings/appear', '/settings/appearance', null],
  ])('%s → %s is %s', (from, to, expected) => {
    expect(stackChange(from, to)).toBe(expected)
  })

  describe("with the tab's own pages (roots)", () => {
    const isRoot = (path: string) => /^\/history(\/\d{4}-\d{2}-\d{2})?$/.test(path)

    test.each([
      [
        'a root with a day opens a week page',
        '/history/2026-10-27',
        '/history/week-2026-44',
        'push',
      ],
      [
        'the week page goes back to a root with a day',
        '/history/week-2026-44',
        '/history/2026-10-27',
        'pop',
      ],
      ['the week page goes back to the plain root', '/history/week-2026-44', '/history', 'pop'],
      ['the plain root opens a week page', '/history', '/history/week-2026-44', 'push'],
      ['week to week is neither', '/history/week-2026-44', '/history/week-2026-43', null],
      [
        'a meal page of a day goes back to another root',
        '/history/2026-10-26/meal-lunch-2026-10-26-u1',
        '/history/2026-10-27',
        'pop',
      ],
      ['two roots', '/history/2026-10-26', '/history/2026-10-27', null],
    ])('%s', (_name, from, to, expected) => {
      expect(stackChange(from, to, isRoot)).toBe(expected)
    })
  })
})

describe('layerTransforms', () => {
  test('at rest the page covers the one below, which waits a bit to the left', () => {
    expect(layerTransforms(0, 400)).toEqual({
      top: 'translate3d(0px, 0, 0)',
      under: `translate3d(${-400 * BACK_PARALLAX}px, 0, 0)`,
      dim: 1,
    })
  })

  test('halfway both pages move, the one below brightening', () => {
    expect(layerTransforms(0.5, 400)).toEqual({
      top: 'translate3d(200px, 0, 0)',
      under: `translate3d(${-200 * BACK_PARALLAX}px, 0, 0)`,
      dim: 0.5,
    })
  })

  test('progress is kept between 0 and 1', () => {
    expect(layerTransforms(1.4, 400).top).toBe('translate3d(400px, 0, 0)')
    expect(layerTransforms(-0.2, 400).top).toBe('translate3d(0px, 0, 0)')
  })
})

describe('startsAtBottomEdge', () => {
  test('a touch in the home-indicator strip belongs to iOS (switching apps), not to the app', () => {
    expect(startsAtBottomEdge(820, 844)).toBe(true)
    expect(startsAtBottomEdge(801, 844)).toBe(true)
    expect(startsAtBottomEdge(799, 844)).toBe(false)
    expect(startsAtBottomEdge(300, 844)).toBe(false)
  })
})
