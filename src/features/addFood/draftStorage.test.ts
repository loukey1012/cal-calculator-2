import { afterEach, describe, expect, test, vi } from 'vitest'
import { sharedLine } from '../dishes/testData'
import { newAddFoodDraft, type AddFoodDraft } from './addFoodDraft'
import { clearAddFoodDraft, loadAddFoodDraft, saveAddFoodDraft } from './draftStorage'

function started(): AddFoodDraft {
  const draft = newAddFoodDraft('me')
  return {
    ...draft,
    mealType: 'dinner',
    dish: {
      ...draft.dish,
      name: 'Rice bowl',
      kcalEstimated: true,
      lines: [sharedLine('l1', 'Rice', 200, 130)],
    },
  }
}

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('cook draft storage', () => {
  test('a saved draft loads again, per person', () => {
    // Arrange
    const draft = started()

    // Act
    saveAddFoodDraft('me', draft)

    // Assert
    expect(loadAddFoodDraft('me')).toEqual(draft)
    expect(loadAddFoodDraft('her')).toBeNull()
  })

  test('remembers the recipe the draft was filled from', () => {
    const recipe = {
      recipeId: 'r-1',
      portions: { 'rp-me': 'p-me' },
      slots: { 's-1': 'l1', 's-2': null },
    }
    const draft = { ...started(), recipe }

    saveAddFoodDraft('me', draft)

    expect(loadAddFoodDraft('me')?.recipe).toEqual(recipe)
  })

  test('a cleared draft is gone', () => {
    saveAddFoodDraft('me', started())
    clearAddFoodDraft('me')
    expect(loadAddFoodDraft('me')).toBeNull()
  })

  test.each([
    ['not JSON', '{oops'],
    ['another shape', JSON.stringify({ version: 1, draft: { dish: { id: 3 } } })],
    ['an older version', JSON.stringify({ version: 0, draft: started() })],
    [
      'no portions',
      JSON.stringify({
        version: 1,
        draft: { ...started(), dish: { ...started().dish, portions: [] } },
      }),
    ],
  ])('a stored draft with %s is ignored', (_reason, stored) => {
    localStorage.setItem('cook-draft:v1:me', stored)
    expect(loadAddFoodDraft('me')).toBeNull()
  })

  test('a draft stored before estimates existed still loads, as not an estimate', () => {
    const { kcalEstimated: _, ...dish } = started().dish
    localStorage.setItem(
      'cook-draft:v1:me',
      JSON.stringify({ version: 1, draft: { ...started(), dish } }),
    )

    expect(loadAddFoodDraft('me')?.dish.kcalEstimated).toBeUndefined()
    expect(loadAddFoodDraft('me')?.dish.name).toBe('Rice bowl')
  })

  test('unavailable storage never breaks cooking', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(() => saveAddFoodDraft('me', started())).not.toThrow()
    expect(loadAddFoodDraft('me')).toBeNull()
  })
})
