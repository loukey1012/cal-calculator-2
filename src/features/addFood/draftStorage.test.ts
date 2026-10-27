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

  test('a draft with ingredients to weigh later loads again', () => {
    const draft = started()
    const withPlaceholder = {
      ...draft,
      dish: { ...draft.dish, toWeigh: [{ id: 'w-1', ingredientId: 'feta', name: 'Feta' }] },
    }

    saveAddFoodDraft('me', withPlaceholder)

    expect(loadAddFoodDraft('me')).toEqual(withPlaceholder)
  })

  test('a draft stored before ingredients could wait for weighing still loads', () => {
    const draft = started()
    localStorage.setItem('cook-draft:v1:me', JSON.stringify({ version: 1, draft }))

    expect(loadAddFoodDraft('me')).toEqual(draft)
  })

  test('invalid or repeated items to weigh are dropped, the rest of the draft stays', () => {
    const draft = started()
    const stored = {
      ...draft,
      dish: {
        ...draft.dish,
        toWeigh: [
          { id: 'w-1', ingredientId: 'feta', name: 'Feta' },
          { id: 'w-1', ingredientId: 'oil', name: 'Oil' },
          { id: '', ingredientId: 'oil', name: 'Oil' },
          { id: 'w-3', ingredientId: 'oil', name: 'x'.repeat(500) },
          { id: 'w-4' },
          'nonsense',
          { id: 'w-5', ingredientId: 'rice', name: 'Rice' },
        ],
      },
    }
    localStorage.setItem('cook-draft:v1:me', JSON.stringify({ version: 1, draft: stored }))

    expect(loadAddFoodDraft('me')).toEqual({
      ...draft,
      dish: {
        ...draft.dish,
        toWeigh: [
          { id: 'w-1', ingredientId: 'feta', name: 'Feta' },
          { id: 'w-5', ingredientId: 'rice', name: 'Rice' },
        ],
      },
    })
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
