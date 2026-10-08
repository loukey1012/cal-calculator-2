import { describe, expect, test } from 'vitest'
import { contrastRatio, isNearWhite, mixHex, onColor, readableInk, visibleOn } from './color'

describe('contrastRatio', () => {
  test('black on white is the maximum 21:1, a color on itself 1:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(contrastRatio('#2f6bff', '#2f6bff')).toBe(1)
  })

  test('is symmetric and case-insensitive', () => {
    expect(contrastRatio('#FFFFFF', '#007aff')).toBeCloseTo(contrastRatio('#007aff', '#ffffff'))
  })
})

describe('mixHex', () => {
  test('blends two colors by weight', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff')
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
  })
})

describe('onColor', () => {
  test('white text on dark fills, near-black text on light fills like lime', () => {
    expect(onColor('#007aff')).toBe('#ffffff')
    expect(onColor('#c6f432')).toBe('#0c0c0d')
  })
})

describe('readableInk', () => {
  test('keeps a color that already reads well on the background', () => {
    expect(readableInk('#0c0c0d', '#ffffff')).toBe('#0c0c0d')
  })

  test('darkens a light accent until it is readable as text on a light background', () => {
    const ink = readableInk('#c6f432', '#f3f4f7')

    expect(ink).not.toBe('#c6f432')
    expect(contrastRatio(ink, '#f3f4f7')).toBeGreaterThanOrEqual(4.5)
  })

  test('lightens a dark accent on a dark background', () => {
    const ink = readableInk('#2b2f36', '#0c0c0d')

    expect(contrastRatio(ink, '#0c0c0d')).toBeGreaterThanOrEqual(4.5)
  })
})

describe('isNearWhite', () => {
  test('white and colors close to it, not light colors like lime or yellow', () => {
    expect(isNearWhite('#ffffff')).toBe(true)
    expect(isNearWhite('#f4f4f4')).toBe(true)
    expect(isNearWhite('#c6f432')).toBe(false)
    expect(isNearWhite('#f5c400')).toBe(false)
    expect(isNearWhite('#000000')).toBe(false)
  })
})

describe('visibleOn', () => {
  test('keeps a color that already stands out from the surface', () => {
    expect(visibleOn('#007aff', '#ffffff')).toBe('#007aff')
    expect(visibleOn('#ffffff', '#17191e')).toBe('#ffffff')
  })

  test('darkens white on a white card just enough to be seen', () => {
    const visible = visibleOn('#ffffff', '#ffffff')

    expect(visible).not.toBe('#ffffff')
    expect(contrastRatio(visible, '#ffffff')).toBeGreaterThanOrEqual(1.3)
  })
})
