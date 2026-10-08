import { describe, expect, test } from 'vitest'
import { ingredient } from '../ingredients/testData'
import { findByBarcode, normalizeBarcode } from './barcode'

describe('normalizeBarcode', () => {
  test('accepts EAN-13, EAN-8 and ITF-14 with a correct check digit', () => {
    expect(normalizeBarcode('3017620422003')).toBe('3017620422003')
    expect(normalizeBarcode('96385074')).toBe('96385074')
    expect(normalizeBarcode('10614141000415')).toBe('10614141000415')
  })

  test('stores UPC-A as EAN-13, so both ways of reading a package match', () => {
    expect(normalizeBarcode('036000291452')).toBe('0036000291452')
  })

  test('ignores spaces and dashes typed with the number', () => {
    expect(normalizeBarcode(' 3017620 422003 ')).toBe('3017620422003')
    expect(normalizeBarcode('3017-6204-22003')).toBe('3017620422003')
  })

  test.each([
    ['a wrong check digit', '3017620422004'],
    ['letters', '30176204220O3'],
    ['too short', '1234567'],
    ['an odd length', '12345678901'],
    ['too long', '123456789012345'],
    ['nothing', '  '],
  ])('rejects %s', (_reason, raw) => {
    expect(normalizeBarcode(raw)).toBeNull()
  })
})

describe('findByBarcode', () => {
  test('finds the ingredient with that barcode, or none', () => {
    const nutella = ingredient({ id: 'n', name: 'Nutella', barcode: '3017620422003' })
    const apple = ingredient({ id: 'a', name: 'Apple' })

    expect(findByBarcode([apple, nutella], '3017620422003')).toBe(nutella)
    expect(findByBarcode([apple, nutella], '96385074')).toBeNull()
  })
})
