import { describe, expect, test } from 'vitest'
import { recipePageOf, recipePath } from './recipePages'

const BASE = '/ingredients/recipes'

describe('recipePageOf', () => {
  test.each([
    [BASE, { kind: 'list' }],
    [`${BASE}/`, { kind: 'list' }],
    [recipePath(BASE, 'r-1'), { kind: 'recipe', recipeId: 'r-1' }],
    [`${BASE}/%E0%A4%A`, { kind: 'list' }],
    ['/ingredients', null],
    ['/ingredients/recipe', null],
    [`${BASE}/r-1/more`, null],
  ])('%s', (path, page) => {
    expect(recipePageOf(path, BASE)).toEqual(page)
  })

  test('a recipe page is one level below the list (a back swipe leads there)', () => {
    expect(recipePath(BASE, 'r 1')).toBe(`${BASE}/r%201`)
  })
})
