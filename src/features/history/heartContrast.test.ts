import { describe, expect, test } from 'vitest'
import { contrastRatio, mixHex } from '../../lib/color'
import css from '../../index.css?raw'

// the heart is a graphic on the calendar's day fills (index.css); WCAG asks 3:1 for graphics
const GRAPHIC_CONTRAST = 3
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
  for (const [, name, value] of body.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    if (name !== undefined && value !== undefined) found.set(name, value)
  }
  return found
}

const lightVariables = variablesOf(SELECTORS.light)

describe.each(Object.entries(SELECTORS))('the heart in the %s theme', (_theme, selector) => {
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
  }

  test.each(Object.entries(fills))('is at least 3:1 on the %s fill', (_name, fill) => {
    expect(contrastRatio(read('--heart'), fill)).toBeGreaterThanOrEqual(GRAPHIC_CONTRAST)
  })
})
