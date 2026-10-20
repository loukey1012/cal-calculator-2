import { describe, expect, test } from 'vitest'
import { gramsItem, HER_LUNCH, ME_LUNCH, sharedLine, testDish } from '../dishes/testData'
import { ingredient } from '../ingredients/testData'
import { mealItem } from '../meals/testData'
import {
  dishFromRecipe,
  recipeFromDish,
  recipeFromMeal,
  recipeKcal,
  withRecipeName,
  type Recipe,
} from './recipeModel'

const eaterOf = (userId: string) => ({ userId, date: '', mealType: 'snack' as const })

function testRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r-1',
    name: 'Chili',
    splitMode: 'equal',
    cookedWeightG: null,
    kcalEstimated: false,
    portions: [
      { id: 'p-me', userId: 'me', splitValue: null },
      { id: 'p-her', userId: 'her', splitValue: null },
    ],
    lines: [sharedLine('l-mince', 'Mince', 400, 250)],
    ...overrides,
  }
}

describe('recipeFromDish', () => {
  test('keeps the lines, split and who eats, without day and meal', () => {
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
    expect(recipe).toEqual({
      id: 'r-new',
      name: 'Chili con carne',
      splitMode: 'count',
      cookedWeightG: null,
      kcalEstimated: true,
      portions: [
        { id: 'p-me', userId: 'me', splitValue: 2 },
        { id: 'p-her', userId: 'her', splitValue: 1 },
      ],
      lines: dish.lines,
    })
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
    expect(recipe.lines.map((line) => [line.allocation, line.item.name])).toEqual([
      ['shared', 'Toast'],
      ['shared', 'Jam'],
    ])
    expect(recipe.lines[0]?.item).toMatchObject({ ingredient_id: 'ing-toast', entered_amount: 60 })
    expect(recipe.lines[0]?.item).not.toHaveProperty('meal_id')
  })

  test('an empty meal has nothing to save', () => {
    expect(() => recipeFromMeal([], 'me', 'Nothing', 'r-new')).toThrow(RangeError)
  })
})

describe('dishFromRecipe', () => {
  test('uses the current values of the ingredient, at the saved amount', () => {
    // Arrange
    const line = {
      ...sharedLine('l-mince', 'Mince', 400, 250),
      item: { ...gramsItem('Mince', 400, 250), ingredient_id: 'ing-mince' },
    }
    const mince = ingredient({ id: 'ing-mince', name: 'Beef mince', kcal_100: 200 })

    // Act
    const dish = dishFromRecipe(testRecipe({ lines: [line] }), [mince], eaterOf)

    // Assert
    expect(dish.lines[0]?.item).toMatchObject({
      ingredient_id: 'ing-mince',
      name: 'Beef mince',
      entered_amount: 400,
      kcal: 200,
      basis_multiplier: 4,
    })
  })

  test('custom items and deleted ingredients keep the saved values', () => {
    const custom = sharedLine('l-cake', 'Cake', 100, 400)
    const gone = {
      ...sharedLine('l-gone', 'Gone', 50, 100),
      item: { ...gramsItem('Gone', 50, 100), ingredient_id: 'ing-gone' },
    }

    const dish = dishFromRecipe(testRecipe({ lines: [custom, gone] }), [], eaterOf)

    expect(dish.lines.map((line) => line.item)).toEqual([custom.item, gone.item])
  })

  test('an ingredient that lost the saved unit keeps the saved values', () => {
    const bar = {
      id: 'l-bar',
      allocation: 'shared' as const,
      item: {
        ...gramsItem('Bar', 1, 0),
        ingredient_id: 'ing-bar',
        entered_unit: 'unit' as const,
        basis: 'per_unit' as const,
        basis_multiplier: 1,
        kcal: 210,
      },
      amounts: {},
    }
    const noUnits = ingredient({ id: 'ing-bar', name: 'Bar', kcal_100: 450 })

    const dish = dishFromRecipe(testRecipe({ lines: [bar] }), [noUnits], eaterOf)

    expect(dish.lines[0]?.item).toEqual(bar.item)
  })

  test('new ids for the dish, its portions and lines; own amounts follow their portion', () => {
    // Arrange
    const cheese = {
      id: 'l-cheese',
      allocation: 'per_portion' as const,
      item: gramsItem('Cheese', 30, 400),
      amounts: { 'p-me': 20, 'p-her': 10 },
    }
    const recipe = testRecipe({
      splitMode: 'percent',
      kcalEstimated: true,
      portions: [
        { id: 'p-me', userId: 'me', splitValue: 60 },
        { id: 'p-her', userId: 'her', splitValue: 30 },
        { id: 'p-left', userId: null, splitValue: 10 },
      ],
      lines: [cheese],
    })

    // Act
    const dish = dishFromRecipe(recipe, [], eaterOf)

    // Assert
    expect(dish.id).not.toBe(recipe.id)
    expect(dish).toMatchObject({ name: 'Chili', splitMode: 'percent', kcalEstimated: true })
    const [me, her, left] = dish.portions
    expect([me?.eater?.userId, her?.eater?.userId, left?.eater]).toEqual(['me', 'her', null])
    expect(dish.portions.map((portion) => portion.splitValue)).toEqual([60, 30, 10])
    expect(dish.portions.map((portion) => portion.id)).not.toContain('p-me')
    const [line] = dish.lines
    expect(line?.id).not.toBe('l-cheese')
    expect(line?.amounts).toEqual({ [me?.id ?? '']: 20, [her?.id ?? '']: 10 })
  })
})

describe('recipeKcal', () => {
  test('the whole recipe at current values', () => {
    const recipe = testRecipe({
      lines: [sharedLine('l-a', 'A', 200, 100), sharedLine('l-b', 'B', 50, 400)],
    })

    expect(recipeKcal(recipe, [])).toBe(400)
  })
})

describe('withRecipeName', () => {
  test('trims the name; an empty one is refused', () => {
    expect(withRecipeName(testRecipe(), '  Soup ').name).toBe('Soup')
    expect(() => withRecipeName(testRecipe(), ' ')).toThrow('Give the recipe a name')
  })
})
