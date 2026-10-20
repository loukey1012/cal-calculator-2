import { gramsItem, sharedLine } from '../dishes/testData'
import type { DishLine } from '../dishes/portions'
import type { Recipe, RecipeSlot } from './recipeModel'

/** A grams line of a product of the database (ingredient id = `ingredientId`). */
export function productLine(
  id: string,
  ingredientId: string,
  name: string,
  grams: number,
  kcalPer100: number,
): DishLine {
  return {
    ...sharedLine(id, name, grams, kcalPer100),
    item: { ...gramsItem(name, grams, kcalPer100), ingredient_id: ingredientId },
  }
}

/** A recipe line; the first choice is the one picked last time unless said otherwise. */
export function slot(
  id: string,
  choices: readonly DishLine[],
  overrides: Partial<RecipeSlot> = {},
): RecipeSlot {
  return {
    id,
    optional: false,
    leftOut: false,
    pickedId: choices[0]?.id ?? '',
    choices,
    ...overrides,
  }
}

/** Chili for two: 400 g mince. */
export function testRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r-1',
    name: 'Chili',
    splitMode: 'equal',
    cookedWeightG: null,
    kcalEstimated: false,
    portions: [
      { id: 'rp-me', userId: 'me', splitValue: null },
      { id: 'rp-her', userId: 'her', splitValue: null },
    ],
    slots: [slot('s-mince', [sharedLine('c-mince', 'Mince', 400, 250)])],
    ...overrides,
  }
}
