import { describe, expect, test } from 'vitest'
import { parseAmount, parseDecimal, roundTo } from './numbers'

describe('roundTo', () => {
  test('rounds to the given number of decimals', () => {
    expect(roundTo(0.16666, 4)).toBe(0.1667)
    expect(roundTo(1.005, 2)).toBe(1.01)
    expect(roundTo(-2.345, 1)).toBe(-2.3)
  })

  test('removes floating point noise', () => {
    expect(roundTo(0.1 * 3, 6)).toBe(0.3)
  })
})

describe('parseDecimal', () => {
  test.each([
    ['12', 12],
    ['12.5', 12.5],
    ['12,5', 12.5],
    [' 0,25 ', 0.25],
    [',5', 0.5],
    ['7.', 7],
  ])('parses %j', (input, expected) => {
    expect(parseDecimal(input)).toBe(expected)
  })

  test.each(['', ' ', 'abc', '1,2,3', '1.2.3', '-4', '12g', '1e3'])('rejects %j', (input) => {
    expect(parseDecimal(input)).toBeNull()
  })
})

describe('parseAmount', () => {
  test.each([
    ['1,5', 1.5],
    ['1/2', 0.5],
    [' 1 / 4 ', 0.25],
    ['1 1/2', 1.5],
    ['2 3/4', 2.75],
  ])('parses %j', (input, expected) => {
    expect(parseAmount(input)).toBe(expected)
  })

  test('a third stays exact', () => {
    expect(parseAmount('1/3')).toBeCloseTo(1 / 3, 10)
  })

  test.each(['', '1/0', '1//2', '/2', '1/', '-1/2', '1/2/3'])('rejects %j', (input) => {
    expect(parseAmount(input)).toBeNull()
  })
})
