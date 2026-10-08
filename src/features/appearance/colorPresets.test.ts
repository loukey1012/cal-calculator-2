import { describe, expect, test } from 'vitest'
import { COLOR_PRESETS } from './colorPresets'

// the colors offered before the lists were merged: accent, ring and partner colors
const EARLIER_CHOICES = [
  ...['#007aff', '#5b5bd6', '#8e4ec6', '#d6409f', '#e5484d', '#ef6c1a', '#c88a04', '#30a46c'],
  ...['#12a594', '#0797b9', '#c6f432', '#64748b'],
  ...['#ff375f', '#e8457c', '#f0874a', '#e8930c', '#f5c400', '#8bc34a', '#1f9d6b', '#2fa889'],
  ...['#2f9bd6', '#9466d6'],
  ...['#ff5c8a', '#f78fb3', '#c2417e', '#e63950', '#ff6f61', '#ff9f7a', '#f5c84c', '#4cc9a0'],
  ...['#8fb996', '#5ab4f0', '#a78bfa', '#d18cf0'],
]

describe('the one list of preset colors', () => {
  test('still offers every color the accent, ring and partner lists offered', () => {
    const values = COLOR_PRESETS.map((preset) => preset.value)

    for (const color of EARLIER_CHOICES) expect(values).toContain(color)
  })

  test('also offers White', () => {
    expect(COLOR_PRESETS).toContainEqual({ name: 'White', value: '#ffffff' })
  })

  test('has no color twice and no name twice (names are what a screen reader says)', () => {
    const values = COLOR_PRESETS.map((preset) => preset.value)
    const names = COLOR_PRESETS.map((preset) => preset.name)

    expect(new Set(values).size).toBe(values.length)
    expect(new Set(names).size).toBe(names.length)
  })

  test('stores colors the way the app compares them: lowercase #rrggbb', () => {
    for (const { value } of COLOR_PRESETS) expect(value).toMatch(/^#[0-9a-f]{6}$/)
  })
})
