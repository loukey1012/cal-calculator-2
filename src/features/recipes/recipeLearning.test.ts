import { describe, expect, test } from 'vitest'
import { withLine, withoutLine } from '../dishes/dishDraft'
import { cookFromRecipe, lineOfSlot, withChoice, withSlotIncluded } from './recipeCooking'
import { learnedRecipe } from './recipeLearning'
import { pickedChoice } from './recipeModel'
import { productLine, slot, testRecipe } from './testData'

const eaterOf = (userId: string) => ({ userId, date: '', mealType: 'snack' as const })

const CLEVER = productLine('c-clever', 'clever', 'Toastbrot Clever', 60, 260)
const SPAR = productLine('c-spar', 'spar', 'Toastbrot Spar', 60, 250)
const GOUDA = productLine('c-gouda', 'gouda', 'Gouda', 30, 350)
const FRISCHKAESE = productLine('c-frisch', 'frisch', 'Frischkäse', 20, 200)

const TOAST = testRecipe({
  name: 'Toast',
  portions: [{ id: 'rp-me', userId: 'me', splitValue: null }],
  slots: [
    slot('s-bread', [CLEVER, SPAR]),
    slot('s-cheese', [GOUDA]),
    slot('s-frisch', [FRISCHKAESE], { optional: true, leftOut: true }),
  ],
})

function slotOf(recipe: typeof TOAST, id: string) {
  const found = recipe.slots.find((candidate) => candidate.id === id)
  if (!found) throw new Error(`no slot ${id}`)
  return found
}

describe('learnedRecipe', () => {
  test('the products used become the last choices, with the amounts used', () => {
    // Arrange: Spar toast today, and more cheese
    let cooked = cookFromRecipe(TOAST, [], eaterOf)
    cooked = withChoice(cooked, slotOf(TOAST, 's-bread'), 'c-spar', [])
    const cheeseLine = lineOfSlot(cooked.dish, cooked.link, 's-cheese')
    if (!cheeseLine) throw new Error('no cheese')
    const dish = withLine(cooked.dish, productLine(cheeseLine.id, 'gouda', 'Gouda', 45, 350))

    // Act
    const { recipe } = learnedRecipe(TOAST, cooked.link, dish)

    // Assert
    expect(slotOf(recipe, 's-bread').pickedId).toBe('c-spar')
    expect(slotOf(recipe, 's-bread').choices).toHaveLength(2)
    expect(pickedChoice(slotOf(recipe, 's-cheese')).item.entered_amount).toBe(45)
  })

  test('a product swapped in is added as a new choice and picked', () => {
    // Arrange: Edamer instead of Gouda
    const cooked = cookFromRecipe(TOAST, [], eaterOf)
    const cheeseId = cooked.link.slots['s-cheese'] ?? ''
    const dish = withLine(cooked.dish, productLine(cheeseId, 'edamer', 'Edamer', 25, 330))

    // Act
    const { recipe } = learnedRecipe(TOAST, cooked.link, dish)

    // Assert
    const cheese = slotOf(recipe, 's-cheese')
    expect(cheese.choices.map((choice) => choice.item.name)).toEqual(['Gouda', 'Edamer'])
    expect(pickedChoice(cheese).item).toMatchObject({ name: 'Edamer', entered_amount: 25 })
  })

  test('an optional line switched on is remembered as on', () => {
    const cooked = withSlotIncluded(
      cookFromRecipe(TOAST, [], eaterOf),
      slotOf(TOAST, 's-frisch'),
      true,
      [],
    )

    const { recipe } = learnedRecipe(TOAST, cooked.link, cooked.dish)

    expect(slotOf(recipe, 's-frisch')).toMatchObject({ optional: true, leftOut: false })
  })

  test('a line removed on Cook becomes optional and stays off next time', () => {
    const cooked = cookFromRecipe(TOAST, [], eaterOf)
    const dish = withoutLine(cooked.dish, cooked.link.slots['s-cheese'] ?? '')

    const { recipe } = learnedRecipe(TOAST, cooked.link, dish)

    expect(slotOf(recipe, 's-cheese')).toMatchObject({ optional: true, leftOut: true })
    expect(cookFromRecipe(recipe, [], eaterOf).dish.lines.map((l) => l.item.name)).toEqual([
      'Toastbrot Clever',
    ])
  })

  test('a line added on Cook joins as an optional line, and the dish stays linked to it', () => {
    // Arrange
    const cooked = cookFromRecipe(TOAST, [], eaterOf)
    const tomato = productLine('l-tomato', 'tomato', 'Tomato', 50, 18)
    const dish = withLine(cooked.dish, tomato)

    // Act
    const { recipe, link } = learnedRecipe(TOAST, cooked.link, dish)

    // Assert
    const added = recipe.slots.at(-1)
    expect(added).toMatchObject({ optional: true, leftOut: false })
    expect(added && pickedChoice(added).item.name).toBe('Tomato')
    expect(added && link.slots[added.id]).toBe('l-tomato')
    // learning again from the same dish adds nothing twice
    expect(learnedRecipe(recipe, link, dish).recipe.slots).toHaveLength(recipe.slots.length)
  })

  test('a partner who ate along this time joins the recipe with their own amounts', () => {
    // Arrange
    const cooked = cookFromRecipe(TOAST, [], eaterOf)
    const partner = { id: 'p-her', eater: eaterOf('her'), splitValue: null }
    const cheeseId = cooked.link.slots['s-cheese'] ?? ''
    const dish = withLine(
      { ...cooked.dish, portions: [...cooked.dish.portions, partner] },
      {
        ...productLine(cheeseId, 'gouda', 'Gouda', 50, 350),
        allocation: 'per_portion',
        amounts: { [cooked.link.portions['rp-me'] ?? '']: 30, 'p-her': 20 },
      },
    )

    // Act
    const { recipe } = learnedRecipe(TOAST, cooked.link, dish)

    // Assert
    expect(recipe.portions.map((portion) => [portion.id, portion.userId])).toEqual([
      ['rp-me', 'me'],
      ['p-her', 'her'],
    ])
    expect(pickedChoice(slotOf(recipe, 's-cheese')).amounts).toEqual({
      'rp-me': 30,
      'p-her': 20,
    })
  })
})
