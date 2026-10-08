import { describe, expect, test } from 'vitest'
import { brandSuggestions } from './brands'
import { ingredient } from './testData'

const withBrand = (id: string, brand: string | null) => ingredient({ id, name: id, brand })

const SAVED = [
  withBrand('a', 'Clever'),
  withBrand('b', 'clever'),
  withBrand('c', 'Clever'),
  withBrand('d', 'Coca-Cola'),
  withBrand('e', 'Rocco'),
  withBrand('f', 'Müller'),
  withBrand('g', null),
  withBrand('h', '  '),
  withBrand('i', 'Milbona'),
]

describe('brandSuggestions', () => {
  test('brands starting with the text come first, then those containing it', () => {
    expect(brandSuggestions(SAVED, 'c')).toEqual(['Clever', 'Coca-Cola', 'Rocco'])
  })

  test('case and accents don’t matter; each brand once, in its most used spelling', () => {
    expect(brandSuggestions(SAVED, 'MULL')).toEqual(['Müller'])
    expect(brandSuggestions(SAVED, 'cle')).toEqual(['Clever'])
  })

  test('nothing for an empty field, or once the text is exactly a saved brand', () => {
    expect(brandSuggestions(SAVED, '  ')).toEqual([])
    expect(brandSuggestions(SAVED, 'Clever')).toEqual([])
    expect(brandSuggestions(SAVED, 'Milbona ')).toEqual([])
  })

  test('the same brand written differently is offered, to fix the spelling', () => {
    expect(brandSuggestions(SAVED, 'clever')).toEqual(['Clever'])
  })

  test('at most six', () => {
    const many = Array.from({ length: 9 }, (_, index) => withBrand(`x${index}`, `Brand ${index}`))

    expect(brandSuggestions(many, 'brand')).toHaveLength(6)
  })
})
