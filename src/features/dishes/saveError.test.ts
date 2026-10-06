import { describe, expect, test } from 'vitest'
import { saveError } from './saveError'
import { testDish } from './testData'

describe('saveError', () => {
  test('a dish with ingredients and someone eating can be saved', () => {
    expect(saveError(testDish())).toBeNull()
  })

  test('needs an ingredient', () => {
    expect(saveError(testDish({ lines: [] }))).toBe('Add at least one ingredient')
  })

  test('needs someone eating', () => {
    const onlyLeftovers = testDish({ portions: [{ id: 'p1', eater: null, splitValue: null }] })
    expect(saveError(onlyLeftovers)).toBe('Choose who eats')
  })
})
