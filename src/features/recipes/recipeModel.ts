import { newId } from '../dishes/dishDraft'
import type { Dish, DishLine, Eater, SplitMode } from '../dishes/portions'
import type { Ingredient } from '../ingredients/ingredientsApi'
import type { MealItem } from '../meals/dayModel'
import { availableUnits } from '../nutrition/amounts'
import {
  buildMealItem,
  ingredientNutrition,
  ingredientSource,
  itemDraftOf,
  type MealItemDraft,
} from '../nutrition/fromIngredient'
import { itemTotals } from '../nutrition/totals'

/**
 * A recipe is a dish saved by name to cook again: its lines (shared or own amounts), split and
 * who eats, without day and meal. A whole meal is saved merged into one dish, since Cook holds
 * one dish at a time. Cooking it uses the ingredients' current values.
 */

export type RecipePortion = {
  readonly id: string
  /** null: a leftover */
  readonly userId: string | null
  readonly splitValue: number | null
}

export type Recipe = {
  readonly id: string
  readonly name: string
  readonly splitMode: SplitMode
  readonly cookedWeightG: number | null
  readonly kcalEstimated: boolean
  readonly portions: readonly RecipePortion[]
  /** nutrition snapshots; own amounts are keyed by the recipe's portion ids */
  readonly lines: readonly DishLine[]
}

// matches recipes.name
export const RECIPE_NAME_MAX = 60

function checkedName(name: string): string {
  const trimmed = name.trim()
  if (trimmed === '') throw new RangeError('Give the recipe a name')
  if (trimmed.length > RECIPE_NAME_MAX) {
    throw new RangeError(`Recipe names have at most ${RECIPE_NAME_MAX} characters`)
  }
  return trimmed
}

export function withRecipeName(recipe: Recipe, name: string): Recipe {
  return { ...recipe, name: checkedName(name) }
}

/**
 * Each person eats once in a recipe: a second portion of the same person (a leftover they took
 * later) and a thrown-away one become leftovers, so the shares stay as cooked.
 */
export function recipeFromDish(dish: Dish, name: string, id: string): Recipe {
  const portions = dish.portions.map((portion, index): RecipePortion => {
    const userId = portion.eater?.userId ?? null
    const isFirst =
      userId !== null &&
      dish.portions.findIndex((other) => other.eater?.userId === userId) === index
    return { id: portion.id, userId: isFirst ? userId : null, splitValue: portion.splitValue }
  })
  return {
    id,
    name: checkedName(name),
    splitMode: dish.splitMode,
    cookedWeightG: dish.cookedWeightG,
    kcalEstimated: dish.kcalEstimated ?? false,
    portions,
    lines: dish.lines,
  }
}

/** What one person ate in a meal, every food a shared line of one dish for them. */
export function recipeFromMeal(
  items: readonly MealItem[],
  userId: string,
  name: string,
  id: string,
): Recipe {
  if (items.length === 0) throw new RangeError('This meal has nothing to save.')
  return {
    id,
    name: checkedName(name),
    splitMode: 'equal',
    cookedWeightG: null,
    kcalEstimated: items.some((item) => item.dish?.kcalEstimated === true),
    portions: [{ id: newId(), userId, splitValue: null }],
    lines: items.map((item) => ({
      id: newId(),
      allocation: 'shared',
      item: itemDraftOf(item),
      amounts: {},
    })),
  }
}

/**
 * The line's food at the ingredient's current values, at the saved amount. Custom items, deleted
 * ingredients and ingredients that lost the saved unit keep the saved snapshot.
 */
function currentItem(item: MealItemDraft, ingredients: readonly Ingredient[]): MealItemDraft {
  const found = ingredients.find((candidate) => candidate.id === item.ingredient_id)
  if (!found) return item
  if (!availableUnits(ingredientNutrition(found)).includes(item.entered_unit)) return item
  return buildMealItem(ingredientSource(found), item.entered_amount, item.entered_unit)
}

/** A fresh dish to cook from the recipe; `eaterOf` places each person (day and meal). */
export function dishFromRecipe(
  recipe: Recipe,
  ingredients: readonly Ingredient[],
  eaterOf: (userId: string) => Eater,
): Dish {
  const portionIds = new Map(recipe.portions.map((portion) => [portion.id, newId()]))
  const newPortionId = (id: string) => portionIds.get(id) ?? id
  return {
    id: newId(),
    name: recipe.name,
    splitMode: recipe.splitMode,
    cookedWeightG: recipe.cookedWeightG,
    kcalEstimated: recipe.kcalEstimated,
    // set when saved
    revision: '',
    portions: recipe.portions.map((portion) => ({
      id: newPortionId(portion.id),
      eater: portion.userId === null ? null : eaterOf(portion.userId),
      splitValue: portion.splitValue,
    })),
    lines: recipe.lines.map((line) => ({
      id: newId(),
      allocation: line.allocation,
      item: currentItem(line.item, ingredients),
      amounts: Object.fromEntries(
        Object.entries(line.amounts).map(([portionId, amount]) => [
          newPortionId(portionId),
          amount,
        ]),
      ),
    })),
  }
}

/** Calories of the whole recipe at current values. */
export function recipeKcal(recipe: Recipe, ingredients: readonly Ingredient[]): number {
  return recipe.lines.reduce(
    (sum, line) => sum + itemTotals(currentItem(line.item, ingredients)).kcal,
    0,
  )
}
