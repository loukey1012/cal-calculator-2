import { describe, expect, test } from 'vitest'
import { describeKcalBurned, parseKcalBurned } from './kcalBurned'

describe('parseKcalBurned', () => {
  test('an empty field means not set', () => {
    expect(parseKcalBurned('  ')).toEqual({ success: true, value: null })
  })

  test('rounds up to whole calories and accepts a decimal comma', () => {
    expect(parseKcalBurned('2600,2')).toEqual({ success: true, value: 2601 })
  })

  test.each([
    ['0', 'Must be more than 0'],
    ['-5', 'Enter a number'],
    ['lots', 'Enter a number'],
    ['100000', 'Too large'],
  ])('refuses %s', (raw, message) => {
    expect(parseKcalBurned(raw)).toEqual({ success: false, message })
  })
})

describe('describeKcalBurned', () => {
  test('shows the figure or Not set', () => {
    expect(describeKcalBurned(2600)).toBe('2,600 kcal')
    expect(describeKcalBurned(null)).toBe('Not set')
  })
})
