import { newId } from '../dishes/dishDraft'
import type { Dish, DishLine } from '../dishes/portions'
import {
  isSameProduct,
  recipePortionsOf,
  singleSlot,
  withAmountsFor,
  type LinkedRecipe,
  type RecipeLink,
  type RecipeSlot,
  type Recipe,
} from './recipeModel'

/**
 * What a recipe learns from a dish cooked from it (when it's logged, or saved over the recipe):
 * the products used become its last choices (a swapped-in one is added as a new choice, with
 * the amounts used), a line left out becomes optional and stays off next time, and a line added
 * on Cook joins as an optional one. Who eats and the split follow the dish.
 */
export function learnedRecipe(recipe: Recipe, link: RecipeLink, dish: Dish): LinkedRecipe {
  const recipePortionOf = new Map(
    Object.entries(link.portions).map(([recipeId, dishId]) => [dishId, recipeId]),
  )
  // people new to the recipe keep their dish portion id
  const toRecipe = (dishPortionId: string) => recipePortionOf.get(dishPortionId) ?? dishPortionId
  const portions = recipePortionsOf(dish, toRecipe)
  const kept = new Set(portions.map((portion) => portion.id))
  const asChoice = (line: DishLine) => withAmountsFor(line, toRecipe)
  // a choice only for people who no longer eat along can't be cooked any more
  const stillCookable = (choice: DishLine) => {
    if (choice.allocation === 'shared') return choice
    const trimmed = withAmountsFor(choice, (id) => (kept.has(id) ? id : undefined))
    return Object.keys(trimmed.amounts).length > 0 ? trimmed : null
  }

  const slots = recipe.slots.flatMap((slot): RecipeSlot[] => {
    const choices = slot.choices.flatMap((choice) => stillCookable(choice) ?? [])
    const lineId = link.slots[slot.id]
    const line = lineId ? dish.lines.find((candidate) => candidate.id === lineId) : undefined
    if (!line) {
      if (choices.length === 0) return []
      const pickedId = choices.some((choice) => choice.id === slot.pickedId)
        ? slot.pickedId
        : (choices[0]?.id ?? slot.pickedId)
      // not on Cook this time (switched off or removed); a line added to the recipe since the
      // dish was filled (lineId undefined) stays as it is
      return lineId === undefined
        ? [{ ...slot, choices, pickedId }]
        : [{ ...slot, choices, pickedId, optional: true, leftOut: true }]
    }
    const used = asChoice(line)
    const match = choices.find((choice) => isSameProduct(choice, line))
    const pickedId = match?.id ?? newId()
    const updated = match
      ? choices.map((choice) => (choice.id === match.id ? { ...used, id: match.id } : choice))
      : [...choices, { ...used, id: pickedId }]
    return [{ ...slot, choices: updated, pickedId, leftOut: false }]
  })

  const linkedLineIds = new Set(Object.values(link.slots))
  const added = dish.lines
    .filter((line) => !linkedLineIds.has(line.id))
    .map((line) => ({ lineId: line.id, slot: { ...singleSlot(asChoice(line)), optional: true } }))

  return {
    recipe: {
      ...recipe,
      splitMode: dish.splitMode,
      cookedWeightG: dish.cookedWeightG,
      kcalEstimated: dish.kcalEstimated ?? false,
      portions,
      slots: [...slots, ...added.map(({ slot }) => slot)],
    },
    // the dish stays linked: added lines now belong to their new recipe lines
    link: {
      ...link,
      portions: Object.fromEntries(
        dish.portions.map((portion) => [toRecipe(portion.id), portion.id]),
      ),
      slots: {
        ...link.slots,
        ...Object.fromEntries(added.map(({ lineId, slot }) => [slot.id, lineId])),
      },
    },
  }
}
