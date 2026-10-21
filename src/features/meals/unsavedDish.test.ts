import { describe, expect, test } from 'vitest'
import { newCookDraft, withEater } from '../cook/cookDraft'
import { isDraftFor } from './unsavedDish'

const TODAY = '2026-10-21'
const LUNCH = { userId: 'u1', date: TODAY, mealType: 'lunch' } as const
const started = { ...newCookDraft('u1'), dish: { ...newCookDraft('u1').dish, name: 'Chili' } }

describe('isDraftFor', () => {
  test('a started dish for the person, day and meal; day and meal follow today until chosen', () => {
    expect(isDraftFor(started, LUNCH, TODAY, 'lunch')).toBe(true)
    expect(isDraftFor(started, LUNCH, TODAY, 'dinner')).toBe(false)
    expect(isDraftFor({ ...started, mealType: 'lunch' }, LUNCH, TODAY, 'dinner')).toBe(true)
    expect(isDraftFor({ ...started, date: '2026-10-20' }, LUNCH, TODAY, 'lunch')).toBe(false)
  })

  test('not an empty one, and not for someone who isn’t eating', () => {
    expect(isDraftFor(newCookDraft('u1'), LUNCH, TODAY, 'lunch')).toBe(false)
    expect(isDraftFor(started, { ...LUNCH, userId: 'u2' }, TODAY, 'lunch')).toBe(false)
    expect(
      isDraftFor(withEater(started, 'u2', true), { ...LUNCH, userId: 'u2' }, TODAY, 'lunch'),
    ).toBe(true)
  })
})
