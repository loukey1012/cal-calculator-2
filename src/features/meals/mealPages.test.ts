import { describe, expect, test } from 'vitest'
import { foodPath, mealPageOf, mealPath, recipesPath } from './mealPages'

const USER = '0b8f7c1e-2d3a-4b5c-8d9e-0f1a2b3c4d5e'
const LUNCH = { userId: USER, date: '2026-10-21', mealType: 'lunch' } as const

describe('meal pages', () => {
  test('a meal opens below Today, or below the History day it was opened from', () => {
    expect(mealPath(LUNCH, 'today')).toBe(`/today/meal-lunch-2026-10-21-${USER}`)
    expect(mealPath(LUNCH, 'history')).toBe(`/history/2026-10-21/meal-lunch-2026-10-21-${USER}`)
  })

  test('reads the meal and the page below it back from the address', () => {
    const today = mealPath(LUNCH, 'today')
    const history = mealPath(LUNCH, 'history')

    expect(mealPageOf(today)).toEqual({ meal: LUNCH, mealPath: today, page: 'meal', rest: [] })
    expect(mealPageOf(`${foodPath(history)}/add/ing-1`)).toEqual({
      meal: LUNCH,
      mealPath: history,
      page: 'food',
      rest: ['add', 'ing-1'],
    })
    expect(mealPageOf(`${recipesPath(today)}/r1`)).toMatchObject({ page: 'recipes', rest: ['r1'] })
  })

  test('Today, History, its days and anything unknown are no meal page', () => {
    expect(mealPageOf('/today')).toBeNull()
    expect(mealPageOf('/history/2026-10-21')).toBeNull()
    expect(mealPageOf(`/settings/meal-lunch-2026-10-21-${USER}`)).toBeNull()
    expect(mealPageOf(`/today/meal-brunch-2026-10-21-${USER}`)).toBeNull()
  })
})
