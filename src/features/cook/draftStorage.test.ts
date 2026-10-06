import { afterEach, describe, expect, test, vi } from 'vitest'
import { sharedLine } from '../dishes/testData'
import { newCookDraft, type CookDraft } from './cookDraft'
import { clearCookDraft, loadCookDraft, saveCookDraft } from './draftStorage'

function started(): CookDraft {
  const draft = newCookDraft('me')
  return {
    ...draft,
    mealType: 'dinner',
    dish: { ...draft.dish, name: 'Rice bowl', lines: [sharedLine('l1', 'Rice', 200, 130)] },
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
    saveCookDraft('me', draft)

    // Assert
    expect(loadCookDraft('me')).toEqual(draft)
    expect(loadCookDraft('her')).toBeNull()
  })

  test('a cleared draft is gone', () => {
    saveCookDraft('me', started())
    clearCookDraft('me')
    expect(loadCookDraft('me')).toBeNull()
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
    expect(loadCookDraft('me')).toBeNull()
  })

  test('unavailable storage never breaks cooking', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(() => saveCookDraft('me', started())).not.toThrow()
    expect(loadCookDraft('me')).toBeNull()
  })
})
