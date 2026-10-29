import { afterEach, describe, expect, test, vi } from 'vitest'
import { clearIngredientDraft, loadIngredientDraft, saveIngredientDraft } from './ingredientDraft'
import { EMPTY_INGREDIENT_FORM } from './ingredientForm'

const typed = {
  ...EMPTY_INGREDIENT_FORM,
  name: 'Leberkäse',
  per100g: { ...EMPTY_INGREDIENT_FORM.per100g, kcal: '297', fat: '27' },
}

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('ingredient drafts', () => {
  test('what was typed is kept per person and ingredient', () => {
    saveIngredientDraft('u1:new', typed)

    expect(loadIngredientDraft('u1:new')).toEqual(typed)
    expect(loadIngredientDraft('u1:ing-7')).toBeNull()
    expect(loadIngredientDraft('u2:new')).toBeNull()
  })

  test('a cleared draft is gone', () => {
    saveIngredientDraft('u1:new', typed)
    clearIngredientDraft('u1:new')

    expect(loadIngredientDraft('u1:new')).toBeNull()
  })

  test('something unreadable is ignored', () => {
    localStorage.setItem('ingredient-draft:v1:u1:new', '{"name": 3}')
    localStorage.setItem('ingredient-draft:v1:u1:x', 'not json')

    expect(loadIngredientDraft('u1:new')).toBeNull()
    expect(loadIngredientDraft('u1:x')).toBeNull()
  })

  test('blocked storage loses nothing else', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })

    expect(() => saveIngredientDraft('u1:new', typed)).not.toThrow()
  })
})

describe('drafts stored before the diet flags', () => {
  test('an old draft without vegan and halal restores with both off', () => {
    const { vegan, halal, ...old } = typed
    expect([vegan, halal]).toEqual([false, false])
    localStorage.setItem('ingredient-draft:v2:u1:new', JSON.stringify(old))

    expect(loadIngredientDraft('u1:new')).toEqual(typed)
  })

  test('the flags typed into a draft are kept', () => {
    saveIngredientDraft('u1:new', { ...typed, vegan: true, halal: true })

    expect(loadIngredientDraft('u1:new')).toMatchObject({ vegan: true, halal: true })
  })
})
