import { describe, expect, test } from 'vitest'
import {
  countsInAverages,
  isLeftOut,
  isMissingMeals,
  missingMainMeals,
  TRACKING_START,
  type CountedDay,
} from './dayCounting'

const TODAY = '2026-10-19'

function day(overrides: Partial<CountedDay> = {}): CountedDay {
  return {
    date: '2026-10-15',
    mealCount: 3,
    lunchLogged: true,
    dinnerLogged: true,
    ...overrides,
  }
}

describe('missingMainMeals', () => {
  test('lunch and dinner need food; breakfast and snacks may be empty', () => {
    expect(missingMainMeals(day())).toEqual([])
    expect(missingMainMeals(day({ lunchLogged: false }))).toEqual(['lunch'])
    expect(missingMainMeals(day({ lunchLogged: false, dinnerLogged: false }))).toEqual([
      'lunch',
      'dinner',
    ])
  })

  test('a day with nothing logged misses both', () => {
    expect(missingMainMeals(undefined)).toEqual(['lunch', 'dinner'])
  })

  test('data cached before the meals were known counts as complete', () => {
    expect(missingMainMeals({ date: '2026-10-15', mealCount: 1 })).toEqual([])
  })
})

describe('isMissingMeals', () => {
  test('a past day from the start of tracking without lunch or dinner is flagged', () => {
    expect(isMissingMeals('2026-10-15', day({ dinnerLogged: false }), TODAY)).toBe(true)
    expect(isMissingMeals(TRACKING_START, undefined, TODAY)).toBe(true)
    expect(isMissingMeals('2026-10-15', day(), TODAY)).toBe(false)
  })

  test('today, days before tracking started and cheat days are never flagged', () => {
    expect(isMissingMeals(TODAY, undefined, TODAY)).toBe(false)
    expect(isMissingMeals('2026-10-09', undefined, TODAY)).toBe(false)
    expect(isMissingMeals('2026-10-15', day({ lunchLogged: false, cheatDay: true }), TODAY)).toBe(
      false,
    )
    expect(isMissingMeals('2026-10-15', day({ lunchLogged: false, cheatMeal: true }), TODAY)).toBe(
      false,
    )
    expect(isMissingMeals('2026-10-15', day({ lunchLogged: false, alcoholDay: true }), TODAY)).toBe(
      false,
    )
  })
})

describe('countsInAverages', () => {
  test('a complete past day counts', () => {
    expect(countsInAverages(day(), TODAY)).toBe(true)
  })

  test('today, a missing main meal, a cheat day or meal, and an empty day never count', () => {
    expect(countsInAverages(day({ date: TODAY }), TODAY)).toBe(false)
    expect(countsInAverages(day({ dinnerLogged: false }), TODAY)).toBe(false)
    expect(countsInAverages(day({ cheatDay: true }), TODAY)).toBe(false)
    expect(countsInAverages(day({ cheatMeal: true }), TODAY)).toBe(false)
    expect(countsInAverages(day({ alcoholDay: true }), TODAY)).toBe(false)
    expect(countsInAverages(day({ mealCount: 0 }), TODAY)).toBe(false)
  })

  test('a day before tracking started still needs lunch and dinner to count', () => {
    expect(countsInAverages(day({ date: '2026-09-01', lunchLogged: false }), TODAY)).toBe(false)
  })
})

describe('isLeftOut', () => {
  test('a cheat day, an alcohol day or a day with a cheat meal', () => {
    expect(isLeftOut(day({ cheatDay: true }))).toBe(true)
    expect(isLeftOut(day({ cheatMeal: true }))).toBe(true)
    expect(isLeftOut(day({ alcoholDay: true }))).toBe(true)
    expect(isLeftOut(day())).toBe(false)
  })

  test('data cached before alcohol days existed is not left out', () => {
    expect(isLeftOut({ date: '2026-10-15', mealCount: 1, cheatDay: false })).toBe(false)
  })
})
