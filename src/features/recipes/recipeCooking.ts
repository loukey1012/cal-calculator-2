import { newId, rescaledLine, withLine, withoutLine } from '../dishes/dishDraft'
import type { Dish, DishLine, Eater } from '../dishes/portions'
import type { Ingredient } from '../ingredients/ingredientsApi'
import { availableUnits } from '../nutrition/amounts'
import {
  buildMealItem,
  ingredientNutrition,
  ingredientSource,
  type MealItemDraft,
} from '../nutrition/fromIngredient'
import { itemTotals } from '../nutrition/totals'
import {
  isSameProduct,
  pickedChoice,
  type Recipe,
  type RecipeLink,
  type RecipeSlot,
} from './recipeModel'

/**
 * Cooking a recipe on Cook: a fresh dish from it (the last choices, optional lines as last
 * time), and switching a line to another choice or an optional line on and off. Uses the
 * ingredients' current values.
 */

/**
 * The food at the ingredient's current values, at the saved amount. Custom items, deleted
 * ingredients and ingredients that lost the saved unit keep the saved snapshot.
 */
export function currentItem(
  item: MealItemDraft,
  ingredients: readonly Ingredient[],
): MealItemDraft {
  const found = ingredients.find((candidate) => candidate.id === item.ingredient_id)
  if (!found) return item
  if (!availableUnits(ingredientNutrition(found)).includes(item.entered_unit)) return item
  return buildMealItem(ingredientSource(found), item.entered_amount, item.entered_unit)
}

/**
 * A choice as a line of the dish: its own amounts go to the dish's portions (people no longer
 * eating are dropped), at current values. null when nobody who has it eats.
 */
export function choiceLine(
  choice: DishLine,
  lineId: string,
  link: RecipeLink,
  dish: Pick<Dish, 'portions'>,
  ingredients: readonly Ingredient[],
): DishLine | null {
  if (choice.allocation === 'shared') {
    return { ...choice, id: lineId, amounts: {}, item: currentItem(choice.item, ingredients) }
  }
  const eating = new Set(dish.portions.map((portion) => portion.id))
  const amounts = Object.fromEntries(
    Object.entries(choice.amounts).flatMap(([portionId, amount]) => {
      const dishPortionId = link.portions[portionId]
      return dishPortionId && eating.has(dishPortionId) ? [[dishPortionId, amount] as const] : []
    }),
  )
  if (Object.keys(amounts).length === 0) return null
  const line = rescaledLine(choice, { allocation: 'per_portion', amounts })
  return { ...line, id: lineId, item: currentItem(line.item, ingredients) }
}

const isLeftOut = (slot: RecipeSlot) => slot.optional && slot.leftOut

/** A fresh dish from the recipe; `eaterOf` places each person (day and meal). */
export function cookFromRecipe(
  recipe: Recipe,
  ingredients: readonly Ingredient[],
  eaterOf: (userId: string) => Eater,
): { readonly dish: Dish; readonly link: RecipeLink } {
  const portions = Object.fromEntries(recipe.portions.map((portion) => [portion.id, newId()]))
  const base: Dish = {
    id: newId(),
    name: recipe.name,
    splitMode: recipe.splitMode,
    cookedWeightG: recipe.cookedWeightG,
    kcalEstimated: recipe.kcalEstimated,
    // set when saved
    revision: '',
    portions: recipe.portions.map((portion) => ({
      id: portions[portion.id] ?? newId(),
      eater: portion.userId === null ? null : eaterOf(portion.userId),
      splitValue: portion.splitValue,
    })),
    lines: [],
  }
  const link: RecipeLink = { recipeId: recipe.id, portions, slots: {} }
  return recipe.slots.reduce(
    (cooked, slot) => {
      const line = isLeftOut(slot)
        ? null
        : choiceLine(pickedChoice(slot), newId(), link, cooked.dish, ingredients)
      return {
        dish: line ? withLine(cooked.dish, line) : cooked.dish,
        link: { ...cooked.link, slots: { ...cooked.link.slots, [slot.id]: line?.id ?? null } },
      }
    },
    { dish: base, link },
  )
}

/** The dish line a recipe line became, if it is (still) in the dish. */
export function lineOfSlot(dish: Dish, link: RecipeLink, slotId: string): DishLine | undefined {
  const lineId = link.slots[slotId]
  return lineId ? dish.lines.find((line) => line.id === lineId) : undefined
}

/** The choice the dish uses for this line now (a swapped-in product isn't one yet). */
export function currentChoiceId(
  slot: RecipeSlot,
  dish: Dish,
  link: RecipeLink,
): string | undefined {
  const line = lineOfSlot(dish, link, slot.id)
  return line && slot.choices.find((choice) => isSameProduct(choice, line))?.id
}

type Cooked = { readonly dish: Dish; readonly link: RecipeLink }

/** Uses another choice for a line (in place of what is there), or adds an optional one. */
export function withChoice(
  cooked: Cooked,
  slot: RecipeSlot,
  choiceId: string,
  ingredients: readonly Ingredient[],
): Cooked {
  const choice = slot.choices.find((candidate) => candidate.id === choiceId)
  if (!choice) return cooked
  const { dish, link } = cooked
  const existing = lineOfSlot(dish, link, slot.id)
  const line = choiceLine(choice, existing?.id ?? newId(), link, dish, ingredients)
  if (!line) return withSlotIncluded(cooked, slot, false, ingredients)
  return {
    dish: withLine(dish, line),
    link: { ...link, slots: { ...link.slots, [slot.id]: line.id } },
  }
}

/** Switches an optional line on (with the choice used last time) or off. */
export function withSlotIncluded(
  cooked: Cooked,
  slot: RecipeSlot,
  included: boolean,
  ingredients: readonly Ingredient[],
): Cooked {
  if (included) return withChoice(cooked, slot, pickedChoice(slot).id, ingredients)
  const existing = lineOfSlot(cooked.dish, cooked.link, slot.id)
  return {
    dish: existing ? withoutLine(cooked.dish, existing.id) : cooked.dish,
    link: { ...cooked.link, slots: { ...cooked.link.slots, [slot.id]: null } },
  }
}

/** Calories of the whole recipe as it would be cooked now: last choices, at current values. */
export function recipeKcal(recipe: Recipe, ingredients: readonly Ingredient[]): number {
  return recipe.slots
    .filter((slot) => !isLeftOut(slot))
    .reduce(
      (sum, slot) => sum + itemTotals(currentItem(pickedChoice(slot).item, ingredients)).kcal,
      0,
    )
}
