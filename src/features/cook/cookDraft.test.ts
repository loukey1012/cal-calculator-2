import { describe, expect, test } from 'vitest'
import { withLine } from '../dishes/dishDraft'
import { gramsItem, sharedLine } from '../dishes/testData'
import {
  draftEaterIds,
  hasContent,
  linesOnlyFor,
  mealForTime,
  newCookDraft,
  resolvedDish,
  withDate,
  withEater,
  withMealType,
  withPrefill,
  type CookDraft,
} from './cookDraft'

const TODAY = '2026-10-06'
const NOON = new Date(2026, 9, 6, 12, 30)

function at(hours: number, minutes = 0): Date {
  return new Date(2026, 9, 6, hours, minutes)
}

function withHerOnlyCheese(draft: CookDraft): CookDraft {
  const herPortion = draft.dish.portions.find((portion) => portion.eater?.userId === 'her')
  if (!herPortion) throw new Error('her portion missing')
  const cheese = {
    id: 'l-cheese',
    allocation: 'per_portion' as const,
    item: gramsItem('Cheese', 20, 400),
    amounts: { [herPortion.id]: 20 },
  }
  return { ...draft, dish: withLine(draft.dish, cheese) }
}

describe('mealForTime', () => {
  test.each([
    [at(6), 'breakfast'],
    [at(10, 59), 'breakfast'],
    [at(11), 'lunch'],
    [at(14, 59), 'lunch'],
    [at(15), 'snack'],
    [at(17), 'dinner'],
    [at(21, 59), 'dinner'],
    [at(22), 'snack'],
    [at(2), 'snack'],
  ])('%s → %s', (now, meal) => {
    expect(mealForTime(now)).toBe(meal)
  })
})

describe('newCookDraft', () => {
  test('starts with only the cook eating, following today and the time of day', () => {
    // Act
    const draft = newCookDraft('me')

    // Assert
    expect(draftEaterIds(draft)).toEqual(['me'])
    expect(draft.date).toBeNull()
    expect(draft.mealType).toBeNull()
    expect(draft.dish.lines).toEqual([])
    expect(hasContent(draft)).toBe(false)
  })
})

describe('withEater', () => {
  test('adds and removes people', () => {
    const both = withEater(newCookDraft('me'), 'her', true)
    expect(draftEaterIds(both)).toEqual(['me', 'her'])
    expect(draftEaterIds(withEater(both, 'me', false))).toEqual(['her'])
  })

  test('adding someone already eating changes nothing', () => {
    const draft = newCookDraft('me')
    expect(withEater(draft, 'me', true)).toBe(draft)
  })

  test('keeps at least one person eating', () => {
    const draft = newCookDraft('me')
    expect(withEater(draft, 'me', false)).toBe(draft)
  })

  test('removing someone drops the ingredients only they had', () => {
    // Arrange
    const draft = withHerOnlyCheese(withEater(newCookDraft('me'), 'her', true))

    // Act
    const herPortionId = draft.dish.portions[1]?.id ?? ''
    const meOnly = withEater(draft, 'her', false)

    // Assert
    expect(linesOnlyFor(draft, 'her').map((line) => line.item.name)).toEqual(['Cheese'])
    expect(linesOnlyFor(draft, 'me')).toEqual([])
    expect(meOnly.dish.lines).toEqual([])
    expect(meOnly.dish.portions.map((portion) => portion.id)).not.toContain(herPortionId)
  })
})

describe('resolvedDish', () => {
  test('every eater eats on today in the meal for the time of day by default', () => {
    // Arrange
    const draft = withEater(newCookDraft('me'), 'her', true)

    // Act
    const dish = resolvedDish(draft, TODAY, NOON)

    // Assert
    expect(dish.portions.map((portion) => portion.eater)).toEqual([
      { userId: 'me', date: TODAY, mealType: 'lunch' },
      { userId: 'her', date: TODAY, mealType: 'lunch' },
    ])
  })

  test('a chosen day and meal win', () => {
    const draft = withMealType(withDate(newCookDraft('me'), '2026-10-04'), 'dinner')
    expect(resolvedDish(draft, TODAY, NOON).portions[0]?.eater).toEqual({
      userId: 'me',
      date: '2026-10-04',
      mealType: 'dinner',
    })
  })

  test('picking today again follows today, so a draft never sticks to an old day', () => {
    const draft = withDate(withDate(newCookDraft('me'), '2026-10-04'), TODAY, TODAY)
    expect(draft.date).toBeNull()
    expect(resolvedDish(draft, '2026-10-07', NOON).portions[0]?.eater?.date).toBe('2026-10-07')
  })

  test('leftover portions stay uneaten', () => {
    const draft = newCookDraft('me')
    const withLeftover: CookDraft = {
      ...draft,
      dish: {
        ...draft.dish,
        portions: [...draft.dish.portions, { id: 'left', eater: null, splitValue: null }],
      },
    }
    expect(resolvedDish(withLeftover, TODAY, NOON).portions[1]?.eater).toBeNull()
  })
})

describe('withPrefill', () => {
  test('an empty draft is set to exactly that person, day and meal', () => {
    // Act
    const draft = withPrefill(
      newCookDraft('me'),
      { userId: 'her', date: '2026-10-04', mealType: 'dinner' },
      TODAY,
    )

    // Assert
    expect(draftEaterIds(draft)).toEqual(['her'])
    expect(draft.date).toBe('2026-10-04')
    expect(draft.mealType).toBe('dinner')
  })

  test('today is stored as following today', () => {
    const draft = withPrefill(
      newCookDraft('me'),
      { userId: 'me', date: TODAY, mealType: 'snack' },
      TODAY,
    )
    expect(draft.date).toBeNull()
  })

  test('a started draft keeps its people and ingredients and adds the person', () => {
    // Arrange
    const started: CookDraft = {
      ...newCookDraft('me'),
      dish: withLine(newCookDraft('me').dish, sharedLine('l-rice', 'Rice', 200, 130)),
    }

    // Act
    const draft = withPrefill(started, { userId: 'her', date: TODAY, mealType: 'dinner' }, TODAY)

    // Assert
    expect(hasContent(started)).toBe(true)
    expect(draftEaterIds(draft)).toEqual(['me', 'her'])
    expect(draft.dish.lines).toHaveLength(1)
    expect(draft.mealType).toBe('dinner')
  })
})
