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

  test('is blocked while an ingredient has no amount', () => {
    const toWeigh = [{ id: 'w-1', ingredientId: 'feta', name: 'Feta' }]
    expect(saveError(testDish({ toWeigh }))).toBe('Weigh 1 ingredient first')
  })

  test('says how many ingredients still need weighing', () => {
    const toWeigh = [
      { id: 'w-1', ingredientId: 'feta', name: 'Feta' },
      { id: 'w-2', ingredientId: 'oil', name: 'Oil' },
    ]
    expect(saveError(testDish({ toWeigh, lines: [] }))).toBe('Weigh 2 ingredients first')
  })

  test('an empty list to weigh does not block', () => {
    expect(saveError(testDish({ toWeigh: [] }))).toBeNull()
  })
})
