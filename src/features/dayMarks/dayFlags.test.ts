import { describe, expect, test } from 'vitest'
import { nextDayMark } from './dayFlags'

describe('nextDayMark', () => {
  test.each([
    [null, 'cheatDay', 'cheat'],
    ['cheat', 'cheatDay', null],
    ['cheat', 'alcohol', 'alcohol'],
    ['alcohol', 'cheatDay', 'cheat'],
    ['alcohol', 'alcohol', null],
    [null, 'alcohol', 'alcohol'],
  ] as const)('%s after tapping %s becomes %s', (current, tapped, expected) => {
    expect(nextDayMark(current, tapped)).toBe(expected)
  })
})
