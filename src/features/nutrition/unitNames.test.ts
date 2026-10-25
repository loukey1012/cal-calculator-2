import { describe, expect, test } from 'vitest'
import { amountSuffix, measureName, measureOf, per100Name, unitChoiceLabel } from './unitNames'

describe('measureOf', () => {
  test('an ingredient cached before measures existed counts as grams', () => {
    expect(measureOf({})).toBe('g')
    expect(measureOf({ measure: 'ml' })).toBe('ml')
  })
})

describe('unit names', () => {
  test('after an amount: g, ml, or the unit name', () => {
    expect(amountSuffix('g')).toBe('g')
    expect(amountSuffix('ml', 'glass')).toBe('ml')
    expect(amountSuffix('unit', 'glass')).toBe('glass')
    expect(amountSuffix('unit', null)).toBe('units')
  })

  test('a unit name that starts with an amount is counted with ×: "1 × 1 Packung"', () => {
    expect(amountSuffix('unit', '1 Packung')).toBe('× 1 Packung')
    expect(amountSuffix('unit', '3 Stück')).toBe('× 3 Stück')
    expect(amountSuffix('unit', '0,5 l Flasche')).toBe('× 0,5 l Flasche')
    expect(amountSuffix('unit', 'Riegel 2')).toBe('Riegel 2')
  })

  test('in sentences: per 100 g or ml, grams or millilitres', () => {
    expect(per100Name('g')).toBe('per 100 g')
    expect(per100Name('ml')).toBe('per 100 ml')
    expect(measureName('g')).toBe('grams')
    expect(measureName('ml')).toBe('millilitres')
  })

  test('to choose from: Grams, Millilitres, or the unit name', () => {
    expect(unitChoiceLabel('g')).toBe('Grams')
    expect(unitChoiceLabel('ml')).toBe('Millilitres')
    expect(unitChoiceLabel('unit', 'bar')).toBe('bar')
    expect(unitChoiceLabel('unit')).toBe('Units')
  })
})
