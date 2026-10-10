import { describe, expect, test } from 'vitest'
import { withFraction } from './fractions'

describe('withFraction', () => {
  test.each([
    ['', '1/3', '1/3'],
    ['0.5', '1/3', '1/3'],
    ['1/2', '1/4', '1/4'],
    ['1', '1/2', '1 1/2'],
    [' 2 ', '3/4', '2 3/4'],
    ['0', '1/2', '1/2'],
  ])('%j and %s make %j', (current, fraction, expected) => {
    expect(withFraction(current, fraction)).toBe(expected)
  })
})
