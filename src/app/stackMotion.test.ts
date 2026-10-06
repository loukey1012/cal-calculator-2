import { describe, expect, test } from 'vitest'
import {
  BACK_PARALLAX,
  dragDirection,
  layerTransforms,
  releaseCompletesBack,
  stackChange,
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
    ['/settings/appear', '/settings/appearance', null],
  ])('%s → %s is %s', (from, to, expected) => {
    expect(stackChange(from, to)).toBe(expected)
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
