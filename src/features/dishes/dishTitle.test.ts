import { describe, expect, test } from 'vitest'
import { autoTitle, dishTitle } from './dishTitle'
import { sharedLine, testDish } from './testData'

describe('autoTitle', () => {
  test.each([
    [[], 'Dish'],
    [['Banana'], 'Banana'],
    [['Pasta', 'Pesto'], 'Pasta, Pesto'],
    [['Pasta', 'Pesto', 'Parmesan', 'Basil'], 'Pasta, Pesto +2'],
  ])('%j → %s', (names, title) => {
    expect(autoTitle(names)).toBe(title)
  })
})

describe('dishTitle', () => {
  test('a named dish shows its name', () => {
    expect(dishTitle(testDish())).toBe('Chili')
  })

  test('an unnamed dish is titled by its ingredients', () => {
    const dish = testDish({
      name: null,
      lines: [sharedLine('l1', 'Rice', 200, 130), sharedLine('l2', 'Curry', 300, 120)],
    })
    expect(dishTitle(dish)).toBe('Rice, Curry')
  })
})
