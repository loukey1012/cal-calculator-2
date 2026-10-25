import { describe, expect, test } from 'vitest'
import { newAddFoodDraft } from './addFoodDraft'
import { legacyCookTarget, parseCookLink } from './legacyCookLink'

const TODAY = '2026-10-06'
const ME = { userId: 'u1', today: TODAY, mealOfDay: 'lunch' } as const
const at = (pathname: string, search = '') => ({ pathname, search })

describe('old Cook links', () => {
  test('a link to a meal opens its Add food, below Today or the History day', () => {
    expect(
      legacyCookTarget(
        at('/cook', '?person=u2&date=2026-10-06&meal=dinner'),
        newAddFoodDraft('u1'),
        ME,
      ),
    ).toBe('/today/meal-dinner-2026-10-06-u2/food')
    expect(
      legacyCookTarget(
        at('/cook', '?person=u2&date=2026-10-04&meal=dinner'),
        newAddFoodDraft('u1'),
        ME,
      ),
    ).toBe('/history/2026-10-04/meal-dinner-2026-10-04-u2/food')
  })

  test('a bare /cook opens the meal a started dish is for, else Today', () => {
    const started = {
      ...newAddFoodDraft('u1'),
      dish: { ...newAddFoodDraft('u1').dish, name: 'Chili' },
    }

    expect(legacyCookTarget(at('/cook'), started, ME)).toBe('/today/meal-lunch-2026-10-06-u1/food')
    expect(legacyCookTarget(at('/cook/add'), newAddFoodDraft('u1'), ME)).toBe('/today')
  })

  test('anything else is no old Cook link', () => {
    expect(legacyCookTarget(at('/today'), newAddFoodDraft('u1'), ME)).toBeNull()
    expect(legacyCookTarget(at('/cookies'), newAddFoodDraft('u1'), ME)).toBeNull()
  })

  test.each([
    ['nothing', {}],
    ['no person', { date: TODAY, meal: 'lunch' }],
    ['a broken day', { person: 'u1', date: '6.10.2026', meal: 'lunch' }],
    ['a future day', { person: 'u1', date: '2026-10-07', meal: 'lunch' }],
    ['an unknown meal', { person: 'u1', date: TODAY, meal: 'brunch' }],
  ])('a link with %s names no meal', (_reason, values) => {
    expect(parseCookLink(new URLSearchParams(values), TODAY)).toBeNull()
  })
})
