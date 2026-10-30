import { describe, expect, test } from 'vitest'
import { flagToastText, nextDayMark } from './dayFlags'

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

describe('flagToastText', () => {
  test.each([
    [{ flag: 'cheatDay', on: true }, 'Cheat day set'],
    [{ flag: 'cheatDay', on: false }, 'Cheat day removed'],
    [{ flag: 'alcohol', on: true }, 'Alcohol day set'],
    [{ flag: 'alcohol', on: false }, 'Alcohol day removed'],
    [{ flag: 'gym', on: true }, 'Gym set'],
    [{ flag: 'gym', on: false }, 'Gym removed'],
    [{ flag: 'sex', on: true }, 'Sex set'],
    [{ flag: 'sex', on: false }, 'Sex removed'],
    [{ flag: 'cheatMeal', meal: 'lunch', on: true }, 'Lunch marked as a cheat meal'],
    [{ flag: 'cheatMeal', meal: 'snack', on: false }, 'Snacks no longer a cheat meal'],
  ] as const)('%j reads "%s"', (change, text) => {
    expect(flagToastText(change, null)).toBe(text)
  })

  test('adds the partner name on the partner’s day', () => {
    expect(flagToastText({ flag: 'gym', on: true }, 'baby')).toBe('Gym set for baby')
    expect(flagToastText({ flag: 'cheatMeal', meal: 'lunch', on: true }, 'baby')).toBe(
      'Lunch marked as a cheat meal for baby',
    )
    expect(flagToastText({ flag: 'cheatMeal', meal: 'lunch', on: false }, 'baby')).toBe(
      'Lunch no longer a cheat meal for baby',
    )
  })
})
