import { describe, expect, test } from 'vitest'
import { ingredient } from '../ingredients/testData'
import { likelyMatch } from './barcodeLink'

const SKYR = ingredient({ id: 'skyr', name: 'Skyr', brand: 'Milbona' })
const JOGHURT = ingredient({ id: 'joghurt', name: 'Joghurt Natur', brand: 'Weihenstephan' })
const BREAD = ingredient({ id: 'bread', name: 'Bread' })

describe('likelyMatch', () => {
  test('a saved ingredient whose name words are all in the product’s name', () => {
    expect(likelyMatch([BREAD, JOGHURT, SKYR], 'Skyr Natur', 'Milbona')).toBe(SKYR)
  })

  test('accents and case don’t matter', () => {
    const kaese = ingredient({ name: 'Käse Gouda' })
    expect(likelyMatch([kaese], 'GOUDA kase jung', '')).toBe(kaese)
  })

  test('another brand is another product', () => {
    expect(likelyMatch([SKYR], 'Skyr Natur', 'Arla')).toBeNull()
    expect(likelyMatch([ingredient({ name: 'Skyr' })], 'Skyr Natur', 'Arla')).not.toBeNull()
  })

  test('a short saved name doesn’t match a much longer product of another kind', () => {
    const milk = ingredient({ name: 'Milch' })
    expect(likelyMatch([milk], 'Milch Schokolade Drink', '')).toBeNull()
    expect(likelyMatch([milk], 'Frische Milch', '')).toBe(milk)
  })

  test('sharing only one of several words needs the same brand', () => {
    expect(likelyMatch([JOGHURT], 'Skyr Natur', 'Milbona')).toBeNull()
    expect(likelyMatch([JOGHURT], 'Skyr Natur', 'Weihenstephan')).toBe(JOGHURT)
  })

  test('ingredients with a barcode already, and short words, are left out', () => {
    expect(likelyMatch([{ ...SKYR, barcode: '20692285' }], 'Skyr Natur', 'Milbona')).toBeNull()
    expect(likelyMatch([ingredient({ name: 'Ei' })], 'Ei de Mar', '')).toBeNull()
  })

  test('without a product name nothing is suggested', () => {
    expect(likelyMatch([SKYR], '', 'Milbona')).toBeNull()
  })
})
