import { describe, expect, test } from 'vitest'
import css from '../../index.css?raw'
import { contrastRatio } from '../../lib/color'
import {
  ACCENT_COLORS,
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
      lightStyle: 'pink',
      darkStyle: 'bento',
      goalPalette: 'pastel',
      progressStyle: 'bars',
      categoryLayout: 'wrap',
      appIcon: 'pink',
    }

    expect(parseAppearance(stored)).toEqual(stored)
  })

  test.each([null, undefined, 'dark', 42, []])('falls back to the defaults for %j', (value) => {
    expect(parseAppearance(value)).toEqual(DEFAULT_APPEARANCE)
  })

  test('new accounts get ring + bars', () => {
    expect(DEFAULT_APPEARANCE.progressStyle).toBe('ringBars')
  })

  test('category chips can be grouped into broad categories', () => {
    expect(parseAppearance({ categoryLayout: 'grouped' }).categoryLayout).toBe('grouped')
  })

  test('category chips stay on one line until changed', () => {
    expect(DEFAULT_APPEARANCE.categoryLayout).toBe('line')
  })

  test('the light style is classic until changed', () => {
    expect(DEFAULT_APPEARANCE.lightStyle).toBe('classic')
    expect(parseAppearance({ lightStyle: 'pink' }).lightStyle).toBe('pink')
  })

  test('the app icon is Graphite until changed', () => {
    expect(DEFAULT_APPEARANCE.appIcon).toBe('graphite')
    expect(parseAppearance({ appIcon: 'sunset' }).appIcon).toBe('sunset')
  })

  test.each(['macro', 'Pink', '../x', 3])(
    'an unknown app icon %j falls back to Graphite',
    (appIcon) => {
      expect(parseAppearance({ appIcon, theme: 'dark' })).toEqual({
        ...DEFAULT_APPEARANCE,
        theme: 'dark',
      })
    },
  )

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

describe('resolveScheme with the pink light style', () => {
  const pink = { ...DEFAULT_APPEARANCE, lightStyle: 'pink' } as const

  test('light paints pink', () => {
    expect(resolveScheme({ ...pink, theme: 'light' }, true)).toBe('pink')
  })

  test('system is pink by day and the dark style at night', () => {
    expect(resolveScheme(pink, false)).toBe('pink')
    expect(resolveScheme(pink, true)).toBe('soft')
  })

  test('dark ignores the light style', () => {
    expect(resolveScheme({ ...pink, theme: 'dark' }, false)).toBe('soft')
  })
})

describe('the pink scheme', () => {
  function cssToken(scheme: string, name: string): string | undefined {
    const selector = scheme === 'light' ? ':root {' : `:root[data-scheme='${scheme}'] {`
    const block = css.slice(css.indexOf(selector), css.indexOf('}', css.indexOf(selector)))
    return new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(block)?.[1]?.toLowerCase()
  }

  test.each(Object.entries(SCHEME_SURFACES))(
    '%s surfaces match the tokens in index.css',
    (scheme, { bg, card, label }) => {
      expect(cssToken(scheme, '--bg')).toBe(bg)
      expect(cssToken(scheme, '--bg-elevated')).toBe(card)
      expect(cssToken(scheme, '--label')).toBe(label)
    },
  )

  test('text stays readable on the pink page and cards', () => {
    const { bg, card, label } = SCHEME_SURFACES.pink
    const secondary = cssToken('pink', '--label-secondary') ?? ''

    for (const surface of [bg, card]) {
      expect(contrastRatio(label, surface)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(secondary, surface)).toBeGreaterThanOrEqual(4.5)
    }
  })

  test('pink has its own goal colors in every fixed palette', () => {
    for (const palette of ['vivid', 'pastel', 'contrast'] as const) {
      expect(goalColors(palette, 'pink', '#007aff')).not.toEqual(
        goalColors(palette, 'light', '#007aff'),
      )
    }
  })

  test.each(ACCENT_COLORS.map((color) => [color.name, color.value]))(
    'accent text in %s stays readable on pink',
    (_name, accent) => {
      const ink = appearanceVariables('vivid', 'pink', accent)['--accent-ink'] ?? ''

      expect(contrastRatio(ink, SCHEME_SURFACES.pink.bg)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(ink, SCHEME_SURFACES.pink.card)).toBeGreaterThanOrEqual(4.5)
    },
  )
})

describe('custom goal colors', () => {
  test('keeps valid colors per goal, lowercased', () => {
    const parsed = parseAppearance({ customGoalColors: { protein: '#2FA889', fat: '#9466d6' } })

    expect(parsed.customGoalColors).toEqual({ protein: '#2fa889', fat: '#9466d6' })
  })

  test('drops only the invalid entries', () => {
    const parsed = parseAppearance({
      darkStyle: 'bento',
      customGoalColors: { kcal: 'red', protein: '#2fa889', carbs: '#12345' },
    })

    expect(parsed.darkStyle).toBe('bento')
    expect(parsed.customGoalColors).toEqual({ protein: '#2fa889' })
  })

  test('anything but an object means no custom colors', () => {
    expect(parseAppearance({ customGoalColors: 'pink' }).customGoalColors ?? {}).toEqual({})
    expect(parseAppearance({}).customGoalColors ?? {}).toEqual({})
  })

  test('custom colors replace the palette color of their goal only', () => {
    const palette = goalColors('vivid', 'light', '#007aff')

    const colors = goalColors('vivid', 'light', '#007aff', { carbs: '#123456' })

    expect(colors).toEqual([palette[0], palette[1], '#123456', palette[3]])
  })

  test('the CSS variables use the custom colors', () => {
    const vars = appearanceVariables('vivid', 'pink', '#d6409f', { protein: '#123456' })

    expect(vars['--goal-protein']).toBe('#123456')
    expect(vars['--goal-kcal']).toBe(goalColors('vivid', 'pink', '#d6409f')[0])
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
