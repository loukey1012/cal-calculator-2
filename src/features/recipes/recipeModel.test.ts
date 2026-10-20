import { describe, expect, test } from 'vitest'
import { gramsItem, HER_LUNCH, ME_LUNCH, sharedLine, testDish } from '../dishes/testData'
import { mealItem } from '../meals/testData'
import {
  choiceLabel,
  linkedRecipeFromDish,
  pickedChoice,
  recipeFromDish,
  recipeFromMeal,
  withoutChoice,
  withRecipeName,
  withSlotOptional,
} from './recipeModel'
import { productLine, slot, testRecipe } from './testData'

describe('recipeFromDish', () => {
  test('keeps the lines (one choice each), split and who eats, without day and meal', () => {
    // Arrange
    const cheese = {
      id: 'l-cheese',
      allocation: 'per_portion' as const,
      item: gramsItem('Cheese', 30, 400),
      amounts: { 'p-me': 20, 'p-her': 10 },
    }
    const dish = testDish({
      splitMode: 'count',
      kcalEstimated: true,
      portions: [
        { id: 'p-me', eater: ME_LUNCH, splitValue: 2 },
        { id: 'p-her', eater: HER_LUNCH, splitValue: 1 },
      ],
      lines: [sharedLine('l-mince', 'Mince', 400, 250), cheese],
    })

    // Act
    const recipe = recipeFromDish(dish, '  Chili con carne ', 'r-new')

    // Assert
    expect(recipe).toMatchObject({
      id: 'r-new',
      name: 'Chili con carne',
      splitMode: 'count',
      kcalEstimated: true,
    })
    const [me, her] = recipe.portions
    expect(recipe.portions.map((portion) => [portion.userId, portion.splitValue])).toEqual([
      ['me', 2],
      ['her', 1],
    ])
    // its own ids: the same dish can become several recipes
    expect(me?.id).not.toBe('p-me')
    expect(recipe.slots).toHaveLength(2)
    expect(recipe.slots.every((s) => s.choices.length === 1 && !s.optional)).toBe(true)
    const savedCheese = recipe.slots[1] && pickedChoice(recipe.slots[1])
    expect(savedCheese?.item).toEqual(cheese.item)
    expect(savedCheese?.amounts).toEqual({ [me?.id ?? '']: 20, [her?.id ?? '']: 10 })
  })

  test('leftovers stay leftovers; a thrown-away one and a second portion of a person too', () => {
    const dish = testDish({
      portions: [
        { id: 'p-me', eater: ME_LUNCH, splitValue: null },
        { id: 'p-me-later', eater: { ...ME_LUNCH, date: '2026-10-06' }, splitValue: null },
        { id: 'p-gone', eater: null, splitValue: null, discarded: true },
      ],
    })

    const recipe = recipeFromDish(dish, 'Chili', 'r-new')

    expect(recipe.portions.map((portion) => portion.userId)).toEqual(['me', null, null])
  })

  test('the dish stays linked to the new recipe', () => {
    const dish = testDish()

    const { recipe, link } = linkedRecipeFromDish(dish, 'Chili', 'r-new')

    expect(link.recipeId).toBe('r-new')
    expect(Object.values(link.portions).toSorted()).toEqual(['p-her', 'p-me'])
    expect(link.slots).toEqual({ [recipe.slots[0]?.id ?? '']: 'l-mince' })
  })

  test('needs a name', () => {
    expect(() => recipeFromDish(testDish(), '   ', 'r-new')).toThrow('Give the recipe a name')
  })
})

describe('recipeFromMeal', () => {
  test('merges everything the person ate into one dish of shared lines', () => {
    // Arrange
    const items = [
      mealItem({ id: 'i-1', name: 'Toast', ingredient_id: 'ing-toast', entered_amount: 60 }),
      mealItem({
        id: 'i-2',
        name: 'Jam',
        entered_amount: 20,
        dish_portion_id: 'dp',
        dish_line_id: 'dl',
        dish: { id: 'd-1', name: 'Jam toast', kcalEstimated: true },
      }),
    ]

    // Act
    const recipe = recipeFromMeal(items, 'me', 'Breakfast', 'r-new')

    // Assert
    expect(recipe.portions).toEqual([{ id: expect.any(String), userId: 'me', splitValue: null }])
    expect(recipe.kcalEstimated).toBe(true)
    const lines = recipe.slots.map(pickedChoice)
    expect(lines.map((line) => [line.allocation, line.item.name])).toEqual([
      ['shared', 'Toast'],
      ['shared', 'Jam'],
    ])
    expect(lines[0]?.item).toMatchObject({ ingredient_id: 'ing-toast', entered_amount: 60 })
    expect(lines[0]?.item).not.toHaveProperty('meal_id')
  })

  test('an empty meal has nothing to save', () => {
    expect(() => recipeFromMeal([], 'me', 'Nothing', 'r-new')).toThrow(RangeError)
  })
})

describe('editing a recipe line', () => {
  const clever = productLine('c-clever', 'clever', 'Toastbrot', 60, 260)
  const spar = { ...productLine('c-spar', 'spar', 'Toastbrot', 60, 250) }
  const bread = slot('s-bread', [clever, spar], { pickedId: 'c-spar' })

  test('a product can be removed; removing the last pick picks the first one left', () => {
    const recipe = testRecipe({ slots: [bread] })

    const withoutSpar = withoutChoice(recipe, 's-bread', 'c-spar')

    expect(withoutSpar.slots[0]).toMatchObject({ pickedId: 'c-clever', choices: [clever] })
    expect(withoutChoice(withoutSpar, 's-bread', 'c-clever')).toEqual(withoutSpar)
  })

  test('a line made required is always cooked again', () => {
    const recipe = testRecipe({ slots: [{ ...bread, optional: true, leftOut: true }] })

    expect(withSlotOptional(recipe, 's-bread', false).slots[0]).toMatchObject({
      optional: false,
      leftOut: false,
    })
  })

  test('labels name the brand', () => {
    expect(choiceLabel({ ...clever, item: { ...clever.item, brand: 'Clever' } })).toBe(
      'Toastbrot (Clever)',
    )
    expect(choiceLabel(clever)).toBe('Toastbrot')
  })
})

describe('withRecipeName', () => {
  test('trims the name; an empty one is refused', () => {
    expect(withRecipeName(testRecipe(), '  Soup ').name).toBe('Soup')
    expect(() => withRecipeName(testRecipe(), ' ')).toThrow('Give the recipe a name')
  })
})
