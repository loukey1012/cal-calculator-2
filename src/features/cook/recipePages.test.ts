import { describe, expect, test } from 'vitest'
import { recipePageOf, recipePath, RECIPES_PATH } from './recipePages'

describe('recipePageOf', () => {
  test.each([
    ['/cook/recipes', { kind: 'list' }],
    ['/cook/recipes/', { kind: 'list' }],
    [recipePath('r-1'), { kind: 'recipe', recipeId: 'r-1' }],
    ['/cook/recipes/%E0%A4%A', { kind: 'list' }],
    ['/cook', null],
    ['/cook/add', null],
    ['/cook/recipes/r-1/more', null],
  ])('%s', (path, page) => {
    expect(recipePageOf(path)).toEqual(page)
  })

  test('a recipe page is one level below the list (a back swipe leads there)', () => {
    expect(recipePath('r 1')).toBe(`${RECIPES_PATH}/r%201`)
  })
})
