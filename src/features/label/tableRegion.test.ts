import { describe, expect, test } from 'vitest'
import {
  enhanceContrast,
  enlargement,
  tableRegion,
  textHeight,
  type PlacedWord,
} from './tableRegion'

const PHOTO = { width: 4000, height: 3000 }

/** a word in the photo, `height` px tall */
function word(text: string, x0: number, y0: number, width = 120, height = 24): PlacedWord {
  return { text, bbox: { x0, y0, x1: x0 + width, y1: y0 + height } }
}

// a small table in the lower right corner, product name and ingredients elsewhere
const WORDS: PlacedWord[] = [
  word('SUPER', 300, 200, 900, 220),
  word('MÜSLI', 1300, 200, 900, 220),
  word('Zutaten:', 300, 1500),
  word('Haferflocken,', 450, 1500),
  word('Nährwerte', 2800, 2300),
  word('pro', 3000, 2300, 50),
  word('100', 3060, 2300, 50),
  word('Energie', 2800, 2340),
  word('kcal', 3200, 2340, 60),
  word('Fett', 2800, 2380, 60),
  word('Kohlenhydrate', 2800, 2420, 200),
  word('Eiweiß', 2800, 2460, 90),
  word('Salz', 2800, 2500, 60),
  word('0,48', 3100, 2500, 60),
]

describe('tableRegion', () => {
  test('a box around the nutrition rows, with room for the value columns to their right', () => {
    const region = tableRegion(WORDS, PHOTO)

    expect(region).not.toBeNull()
    // the table's words are inside, the product name and the ingredients are not
    expect(region!.x0).toBeLessThanOrEqual(2800)
    expect(region!.y0).toBeLessThanOrEqual(2300)
    expect(region!.y1).toBeGreaterThanOrEqual(2524)
    expect(region!.x1).toBeGreaterThan(3260)
    expect(region!.y0).toBeGreaterThan(1600)
    expect(region!.x0).toBeGreaterThan(2000)
    // never outside the photo
    expect(region!.x1).toBeLessThanOrEqual(PHOTO.width)
    expect(region!.y1).toBeLessThanOrEqual(PHOTO.height)
  })

  test('rows the first reading garbled are still inside: the table goes down from its energy row', () => {
    // as read from a real package: only the header and the energy row came out right
    const words = [
      word('Zutaten:', 300, 450, 140, 28),
      word('Zucker,', 900, 450, 120, 28),
      word('Salz.', 600, 520, 80, 28),
      word('Nährwerte', 2000, 1520, 110, 15),
      word('Energie', 2000, 1547, 80, 15),
      word('kcal', 2190, 1547, 40, 15),
      word('Pet', 2000, 1574, 40, 15),
      word('Kohlenkydrate', 2000, 1601, 130, 15),
      word('saz', 2000, 1655, 40, 15),
    ]

    const region = tableRegion(words, PHOTO)

    // the last row (salt) is in, the ingredients above are not
    expect(region!.y1).toBeGreaterThan(1670)
    expect(region!.y0).toBeGreaterThan(600)
    expect(region!.x0).toBeLessThanOrEqual(2000)
    expect(region!.x0).toBeGreaterThan(1100)
  })

  test('ingredients mentioning sugar and salt alone are no table', () => {
    expect(tableRegion([word('Zucker,', 100, 100), word('Salz.', 300, 100)], PHOTO)).toBeNull()
  })

  test('words are matched without accents and case, and spelling slips in units', () => {
    const region = tableRegion(
      [word('ENERGY', 100, 100), word('PROTEIN', 100, 140), word('kJ/kcal', 300, 100)],
      PHOTO,
    )

    expect(region).not.toBeNull()
  })

  test('fewer than two nutrition words: no table found', () => {
    expect(tableRegion([word('Fett', 100, 100), word('Zutaten:', 100, 300)], PHOTO)).toBeNull()
    expect(tableRegion([], PHOTO)).toBeNull()
  })

  test('a word far away from the others (e.g. "Energie" in a slogan) is left out', () => {
    const region = tableRegion([...WORDS, word('Energie', 300, 600, 300, 60)], PHOTO)

    expect(region!.x0).toBeGreaterThan(2000)
    expect(region!.y0).toBeGreaterThan(1600)
  })
})

describe('textHeight', () => {
  test('the letters of the header and energy row, not borders the words took along', () => {
    const words = [
      { ...word('Energie', 100, 100, 80, 56), letterHeight: 15 },
      { ...word('kcal', 300, 100, 40, 56), letterHeight: 14 },
      word('Nährwerte', 100, 60, 110, 16),
    ]

    expect(textHeight(words)).toBe(15)
  })
})

describe('enlargement', () => {
  test('small text is enlarged to a comfortable size, at most 2.5 times; big text made smaller', () => {
    // bigger reads worse: at 3 times a real table came out as its first line only
    expect(enlargement(6, { width: 600, height: 300 })).toBe(2.5)
    expect(enlargement(12, { width: 600, height: 300 })).toBeCloseTo(2)
    expect(enlargement(40, { width: 600, height: 300 })).toBeCloseTo(0.6)
  })

  test('very big letters (a close-up) are made smaller, to at most 0.4 times', () => {
    expect(enlargement(100, { width: 2000, height: 1500 })).toBe(0.4)
  })

  test('never bigger than the reading size allows', () => {
    expect(enlargement(10, { width: 1500, height: 900 })).toBeCloseTo(2500 / 1500)
  })
})

describe('enhanceContrast', () => {
  test('grey, and stretched so the darkest becomes black and the lightest white', () => {
    // two pixels: a mid grey-blue and a light one
    const pixels = new Uint8ClampedArray([100, 100, 140, 255, 200, 200, 200, 255])

    const out = enhanceContrast(pixels)

    expect(Array.from(out)).toEqual([0, 0, 0, 255, 255, 255, 255, 255])
    // a new array: the photo itself is left alone
    expect(Array.from(pixels)).toEqual([100, 100, 140, 255, 200, 200, 200, 255])
  })

  test('a single color stays as it is (nothing to stretch)', () => {
    const pixels = new Uint8ClampedArray([128, 128, 128, 255, 128, 128, 128, 255])

    expect(Array.from(enhanceContrast(pixels))).toEqual([128, 128, 128, 255, 128, 128, 128, 255])
  })
})
