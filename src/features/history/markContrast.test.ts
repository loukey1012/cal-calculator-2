import { describe, expect, test } from 'vitest'
import { contrastRatio, mixHex } from '../../lib/color'
import css from '../../index.css?raw'

// the marks are graphics on the calendar's day fills (index.css); WCAG asks 3:1 for graphics
const GRAPHIC_CONTRAST = 3
// the marks that can sit on any day (counted days included)
const MARKS = ['--heart', '--cheat', '--weigh', '--note', '--gym'] as const
// the badges only appear on left-out days: the card and the grey fill
// the diet marks (leaf, H in a circle) sit on list cards
const DIET_MARKS = ['--vegan', '--halal'] as const
const BADGE_COLORS = ['--alcohol', '--cheat', '--missing'] as const
// the filled badges at the top right carry a glyph in --on-missing
const SELECTORS = {
  light: ':root {',
  pink: ":root[data-scheme='pink'] {",
  soft: ":root[data-scheme='soft'] {",
  bento: ":root[data-scheme='bento'] {",
} as const

function variablesOf(selector: string): Map<string, string> {
  const start = css.indexOf(selector)
  const body = css.slice(start, css.indexOf('}', start))
  const found = new Map<string, string>()
  for (const [, name, value] of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    if (name !== undefined && value !== undefined) found.set(name, value.trim())
  }
  return found
}

/** "rgb(18 21 26 / 0.06)" laid over a background, as a hex color. */
function overlay(background: string, rgba: string): string {
  const match = /^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)$/.exec(rgba)
  if (!match) throw new Error(`not an rgb() with alpha: ${rgba}`)
  const hex = [match[1], match[2], match[3]]
    .map((part) => Number(part).toString(16).padStart(2, '0'))
    .join('')
  return mixHex(background, `#${hex}`, Number(match[4]))
}

const lightVariables = variablesOf(SELECTORS.light)

describe.each(Object.entries(SELECTORS))(
  'the calendar marks in the %s theme',
  (_theme, selector) => {
    // a theme keeps the light values it doesn't override
    const variables = new Map([...lightVariables, ...variablesOf(selector)])
    const read = (name: string) => {
      const value = variables.get(name)
      if (value === undefined) throw new Error(`${name} missing`)
      return value
    }
    const card = read('--bg-elevated')
    const fills = {
      card,
      'within goal': mixHex(card, read('--success'), 0.25),
      over: mixHex(card, read('--destructive'), 0.3),
      'well over': mixHex(card, read('--destructive'), 0.38),
      'left out (grey)': overlay(card, read('--fill')),
    }

    describe.each(MARKS)('%s', (mark) => {
      test.each(Object.entries(fills))('is at least 3:1 on the %s fill', (_name, fill) => {
        expect(contrastRatio(read(mark), fill)).toBeGreaterThanOrEqual(GRAPHIC_CONTRAST)
      })
    })

    test.each(DIET_MARKS)('%s is at least 3:1 on the card', (mark) => {
      expect(contrastRatio(read(mark), card)).toBeGreaterThanOrEqual(GRAPHIC_CONTRAST)
    })

    test.each(BADGE_COLORS)(
      '%s is at least 3:1 on the card and on the grey left-out fill',
      (badge) => {
        for (const fill of [fills.card, fills['left out (grey)']]) {
          expect(contrastRatio(read(badge), fill)).toBeGreaterThanOrEqual(GRAPHIC_CONTRAST)
        }
      },
    )

    test.each(BADGE_COLORS)('the badge glyph is at least 3:1 on the %s badge', (badge) => {
      expect(contrastRatio(read('--on-missing'), read(badge))).toBeGreaterThanOrEqual(
        GRAPHIC_CONTRAST,
      )
    })
  },
)

// the day-flag chips (Today) fill with these colours and write in --on-mark
const TEXT_CONTRAST = 4.5
const CHIP_COLORS = ['--cheat', '--alcohol', '--gym', '--heart'] as const

describe.each(Object.entries(SELECTORS))('the day-flag chips in the %s theme', (_t, selector) => {
  const variables = new Map([...lightVariables, ...variablesOf(selector)])
  const read = (name: string) => {
    const value = variables.get(name)
    if (value === undefined) throw new Error(`${name} missing`)
    return value
  }

  test.each(CHIP_COLORS)('--on-mark is at least 4.5:1 on a chip filled with %s', (color) => {
    expect(contrastRatio(read('--on-mark'), read(color))).toBeGreaterThanOrEqual(TEXT_CONTRAST)
  })

  test('the off label is at least 4.5:1 on the card', () => {
    expect(contrastRatio(read('--label-secondary'), read('--bg-elevated'))).toBeGreaterThanOrEqual(
      TEXT_CONTRAST,
    )
  })
})
