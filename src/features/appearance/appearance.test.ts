import { describe, expect, test } from 'vitest'
import { contrastRatio } from '../../lib/color'
import {
  appearanceVariables,
  DEFAULT_APPEARANCE,
  goalColors,
  parseAppearance,
  resolveScheme,
  SCHEME_SURFACES,
} from './appearance'

describe('parseAppearance', () => {
  test('reads a stored appearance', () => {
    const stored = {
      theme: 'dark',
      darkStyle: 'bento',
      goalPalette: 'pastel',
      progressStyle: 'bars',
      categoryLayout: 'wrap',
    }

    expect(parseAppearance(stored)).toEqual(stored)
  })

  test.each([null, undefined, 'dark', 42, []])('falls back to the defaults for %j', (value) => {
    expect(parseAppearance(value)).toEqual(DEFAULT_APPEARANCE)
  })

  test('new accounts get ring + bars', () => {
    expect(DEFAULT_APPEARANCE.progressStyle).toBe('ringBars')
  })

  test('category chips stay on one line until changed', () => {
    expect(DEFAULT_APPEARANCE.categoryLayout).toBe('line')
  })

  test('an unknown value only resets that one field', () => {
    expect(parseAppearance({ theme: 'sepia', darkStyle: 'bento' })).toEqual({
      ...DEFAULT_APPEARANCE,
      darkStyle: 'bento',
    })
  })
})

describe('resolveScheme', () => {
  const bento = { ...DEFAULT_APPEARANCE, darkStyle: 'bento' } as const

  test('system follows the device, using the chosen dark style', () => {
    expect(resolveScheme(bento, false)).toBe('light')
    expect(resolveScheme(bento, true)).toBe('bento')
  })

  test('light and dark ignore the device setting', () => {
    expect(resolveScheme({ ...bento, theme: 'light' }, true)).toBe('light')
    expect(resolveScheme({ ...bento, theme: 'dark' }, false)).toBe('bento')
    expect(resolveScheme({ ...DEFAULT_APPEARANCE, theme: 'dark' }, false)).toBe('soft')
  })
})

describe('goalColors', () => {
  test('fixed palettes have one color per goal', () => {
    expect(goalColors('vivid', 'light', '#007aff')).toHaveLength(4)
  })

  test('the accent palette starts with the accent and fades it', () => {
    const colors = goalColors('accent', 'light', '#007aff')

    expect(colors[0]).toBe('#007aff')
    expect(new Set(colors).size).toBe(4)
  })
})

describe('appearanceVariables', () => {
  test('keeps accent text readable even for a light accent on a light page', () => {
    const vars = appearanceVariables('vivid', 'light', '#c6f432')

    expect(vars['--accent']).toBe('#c6f432')
    expect(
      contrastRatio(vars['--accent-ink'] ?? '', SCHEME_SURFACES.light.bg),
    ).toBeGreaterThanOrEqual(4.5)
    expect(vars['--on-accent']).toBe('#0c0c0d')
  })

  test('sets one variable per goal color', () => {
    const vars = appearanceVariables('vivid', 'soft', '#007aff')

    expect(Object.keys(vars)).toEqual(
      expect.arrayContaining(['--goal-kcal', '--goal-protein', '--goal-carbs', '--goal-fat']),
    )
  })
})
