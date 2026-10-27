import { describe, expect, test } from 'vitest'
import type { Goal } from '../nutrition/goals'
import { dayStatusPill, type DayStatusInput } from './dayStatusPill'

const GOAL: Goal = {
  validFrom: '2026-09-01',
  kcal: 2000,
  proteinG: null,
  carbsG: null,
  fatG: null,
  fiberG: null,
  weightGoalKg: null,
}
const TODAY = '2026-10-20'
const PAST = '2026-10-15'

/** a complete past day with the given calories, against a 2000 kcal goal */
function input(overrides: Partial<DayStatusInput> & { kcal?: number } = {}): DayStatusInput {
  return {
    date: PAST,
    today: TODAY,
    kcal: 1800,
    estimated: false,
    goal: GOAL,
    day: { date: PAST, mealCount: 3, lunchLogged: true, dinnerLogged: true },
    ...overrides,
  }
}

describe('dayStatusPill', () => {
  test.each([
    ['under the goal', 1680, 'Within goal · 320 kcal left'],
    ['exactly on the goal', 2000, 'Within goal · 0 kcal left'],
    ['a little over', 2140, 'Within goal · 140 kcal over'],
    ['exactly 10 % over', 2200, 'Within goal · 200 kcal over'],
  ])('is within the goal %s', (_name, kcal, text) => {
    expect(dayStatusPill(input({ kcal }))).toEqual({ text, tone: 'within' })
  })

  test('rounds calories up to whole kcal like the calendar', () => {
    expect(dayStatusPill(input({ kcal: 1679.2 }))?.text).toBe('Within goal · 320 kcal left')
  })

  test('shows the share when more than 10 % over', () => {
    expect(dayStatusPill(input({ kcal: 2230 }))).toEqual({
      text: '230 kcal over · 12 %',
      tone: 'over',
    })
    expect(dayStatusPill(input({ kcal: 2201 }))?.tone).toBe('over')
  })

  test('is well over from more than 300 kcal over, without the share', () => {
    expect(dayStatusPill(input({ kcal: 2300 }))?.tone).toBe('over')
    expect(dayStatusPill(input({ kcal: 2301 }))?.tone).toBe('wellOver')
    expect(dayStatusPill(input({ kcal: 2420 }))).toEqual({
      text: '420 kcal over',
      tone: 'wellOver',
    })
  })

  test('marks estimated calories with a tilde', () => {
    expect(dayStatusPill(input({ kcal: 1680, estimated: true }))?.text).toBe(
      'Within goal · ~320 kcal left',
    )
    expect(dayStatusPill(input({ kcal: 2420, estimated: true }))?.text).toBe('~420 kcal over')
    expect(dayStatusPill(input({ kcal: 2230, estimated: true }))?.text).toBe(
      '~230 kcal over · 12 %',
    )
  })

  test.each([
    ['cheatDay', 'Cheat day · not counted', 'leftOut'],
    ['cheatMeal', 'Cheat meal · not counted', 'leftOut'],
    ['alcoholDay', 'Alcohol day · not counted', 'alcohol'],
  ] as const)('a day left out by %s is not judged', (flag, text, tone) => {
    const day = { date: PAST, mealCount: 3, lunchLogged: true, dinnerLogged: true, [flag]: true }
    expect(dayStatusPill(input({ kcal: 5000, day }))).toEqual({ text, tone })
  })

  test('a cheat day wins over an alcohol day and a missing meal', () => {
    const day = { date: PAST, mealCount: 1, cheatDay: true, alcoholDay: true, lunchLogged: false }
    expect(dayStatusPill(input({ day }))?.text).toBe('Cheat day · not counted')
  })

  test.each([
    [{ lunchLogged: false, dinnerLogged: true }, 'Lunch missing · not counted'],
    [{ lunchLogged: true, dinnerLogged: false }, 'Dinner missing · not counted'],
    [{ lunchLogged: false, dinnerLogged: false }, 'Lunch and dinner missing · not counted'],
  ])('a past day with a main meal missing: %j', (meals, text) => {
    const day = { date: PAST, mealCount: 1, ...meals }
    expect(dayStatusPill(input({ day }))).toEqual({ text, tone: 'missing' })
  })

  test('days before tracking started are not flagged as missing a meal', () => {
    const date = '2026-10-05'
    const day = { date, mealCount: 1, lunchLogged: false, dinnerLogged: false }
    expect(dayStatusPill(input({ date, day, kcal: 1800 }))?.text).toBe(
      'Within goal · 200 kcal left',
    )
  })

  test('says no goal is set when there is none', () => {
    expect(dayStatusPill(input({ goal: null }))).toEqual({ text: 'No goal set', tone: 'neutral' })
  })

  test('shows nothing for an early past day without food', () => {
    const date = '2026-10-05'
    const day = { date, mealCount: 0 }
    expect(dayStatusPill(input({ date, day, kcal: 0 }))).toBeNull()
  })

  describe('today', () => {
    const day = { date: TODAY, mealCount: 1, lunchLogged: false, dinnerLogged: false }
    const base = input({ date: TODAY, day })

    test('is never judged, even far over', () => {
      expect(dayStatusPill({ ...base, kcal: 1680 })).toEqual({
        text: 'So far · 320 kcal left',
        tone: 'neutral',
      })
      expect(dayStatusPill({ ...base, kcal: 2420 })).toEqual({
        text: 'So far · 420 kcal over',
        tone: 'neutral',
      })
    })

    test('is not flagged for missing meals and keeps the estimate tilde', () => {
      expect(dayStatusPill({ ...base, kcal: 1680, estimated: true })?.text).toBe(
        'So far · ~320 kcal left',
      )
    })

    test('still shows a cheat day mark', () => {
      const marked = { ...day, cheatDay: true }
      expect(dayStatusPill({ ...base, day: marked })?.text).toBe('Cheat day · not counted')
    })

    test('says no goal is set when there is none', () => {
      expect(dayStatusPill({ ...base, goal: null })?.text).toBe('No goal set')
    })
  })
})
