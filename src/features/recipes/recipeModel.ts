import { newId } from '../dishes/dishDraft'
import type { Dish, DishLine, SplitMode } from '../dishes/portions'
import type { MealItem } from '../meals/dayModel'
import { itemDraftOf } from '../nutrition/fromIngredient'

/**
 * A recipe is a dish saved by name to cook again: who eats, the split and its lines, without day
 * and meal. Each line can hold several products ("choices", each with its own amount: toast
 * bread from Clever or from Spar) and can be optional (Frischkäse sometimes). It remembers the
 * choice used last time and whether an optional line was left out. A whole meal is saved merged
 * into one dish, since Cook holds one dish at a time.
 */

export type RecipePortion = {
  readonly id: string
  /** null: a leftover */
  readonly userId: string | null
  readonly splitValue: number | null
}

/** One line of the recipe; each choice is a line of its own (own amounts keyed by portion). */
export type RecipeSlot = {
  readonly id: string
  readonly optional: boolean
  /** an optional line left out last time */
  readonly leftOut: boolean
  /** the choice used last time */
  readonly pickedId: string
  readonly choices: readonly DishLine[]
}

export type Recipe = {
  readonly id: string
  readonly name: string
  readonly splitMode: SplitMode
  readonly cookedWeightG: number | null
  readonly kcalEstimated: boolean
  readonly portions: readonly RecipePortion[]
  readonly slots: readonly RecipeSlot[]
}

/** Which recipe a Cook dish came from, and what of it went where. */
export type RecipeLink = {
  readonly recipeId: string
  /** recipe portion id → dish portion id */
  readonly portions: Readonly<Record<string, string>>
  /** recipe line (slot) id → the dish line it became; null: an optional line left out */
  readonly slots: Readonly<Record<string, string | null>>
}

export type LinkedRecipe = { readonly recipe: Recipe; readonly link: RecipeLink }

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

export function pickedChoice(slot: RecipeSlot): DishLine {
  const picked = slot.choices.find((choice) => choice.id === slot.pickedId) ?? slot.choices[0]
  if (!picked) throw new RangeError('A recipe line needs at least one choice')
  return picked
}

/** The same product: the same ingredient, or for a custom item the same name and brand. */
export function isSameProduct(a: DishLine, b: DishLine): boolean {
  if (a.item.ingredient_id !== null || b.item.ingredient_id !== null) {
    return a.item.ingredient_id === b.item.ingredient_id
  }
  return a.item.name === b.item.name && a.item.brand === b.item.brand
}

/** The line's own amounts under other portion ids; portions without an id are dropped. */
export function withAmountsFor(
  line: DishLine,
  portionId: (id: string) => string | undefined,
): DishLine {
  const amounts = Object.entries(line.amounts).flatMap(([id, amount]) => {
    const mapped = portionId(id)
    return mapped === undefined ? [] : [[mapped, amount] as const]
  })
  return { ...line, amounts: Object.fromEntries(amounts) }
}

/** A required line with a single choice. */
export function singleSlot(line: DishLine): RecipeSlot {
  const choiceId = newId()
  return {
    id: newId(),
    optional: false,
    leftOut: false,
    pickedId: choiceId,
    choices: [{ ...line, id: choiceId }],
  }
}

/**
 * Who eats, as a recipe remembers it: each person once (a second portion of the same person,
 * e.g. a leftover they took later, and a thrown-away one become leftovers, so the shares stay).
 */
export function recipePortionsOf(
  dish: Dish,
  idOf: (dishPortionId: string) => string,
): RecipePortion[] {
  return dish.portions.map((portion, index): RecipePortion => {
    const userId = portion.eater?.userId ?? null
    const isFirst =
      userId !== null &&
      dish.portions.findIndex((other) => other.eater?.userId === userId) === index
    return { id: idOf(portion.id), userId: isFirst ? userId : null, splitValue: portion.splitValue }
  })
}

/**
 * A new recipe from a dish (every line required, with one choice), and how the dish relates to
 * it, so cooking it on can teach the recipe.
 */
export function linkedRecipeFromDish(dish: Dish, name: string, id: string): LinkedRecipe {
  const portionIds = new Map(dish.portions.map((portion) => [portion.id, newId()]))
  const slots = dish.lines.map((line) => ({
    lineId: line.id,
    slot: singleSlot(withAmountsFor(line, (portionId) => portionIds.get(portionId))),
  }))
  const recipe: Recipe = {
    id,
    name: checkedName(name),
    splitMode: dish.splitMode,
    cookedWeightG: dish.cookedWeightG,
    kcalEstimated: dish.kcalEstimated ?? false,
    portions: recipePortionsOf(dish, (portionId) => portionIds.get(portionId) ?? newId()),
    slots: slots.map(({ slot }) => slot),
  }
  const link: RecipeLink = {
    recipeId: id,
    portions: Object.fromEntries([...portionIds].map(([dishId, recipeId]) => [recipeId, dishId])),
    slots: Object.fromEntries(slots.map(({ lineId, slot }) => [slot.id, lineId])),
  }
  return { recipe, link }
}

export function recipeFromDish(dish: Dish, name: string, id: string): Recipe {
  return linkedRecipeFromDish(dish, name, id).recipe
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
    slots: items.map((item) =>
      singleSlot({ id: newId(), allocation: 'shared', item: itemDraftOf(item), amounts: {} }),
    ),
  }
}

/** e.g. "Gouda (Billa)" */
export function choiceLabel(choice: DishLine): string {
  return choice.item.brand ? `${choice.item.name} (${choice.item.brand})` : choice.item.name
}

function withSlot(recipe: Recipe, slotId: string, change: (slot: RecipeSlot) => RecipeSlot) {
  return {
    ...recipe,
    slots: recipe.slots.map((slot) => (slot.id === slotId ? change(slot) : slot)),
  }
}

/** Drops a product from a line; the last one stays (remove the line by cooking without it). */
export function withoutChoice(recipe: Recipe, slotId: string, choiceId: string): Recipe {
  return withSlot(recipe, slotId, (slot) => {
    const choices = slot.choices.filter((choice) => choice.id !== choiceId)
    const [first] = choices
    if (!first) return slot
    return {
      ...slot,
      choices,
      pickedId: slot.pickedId === choiceId ? first.id : slot.pickedId,
    }
  })
}

/** A required line is always cooked; an optional one as last time. */
export function withSlotOptional(recipe: Recipe, slotId: string, optional: boolean): Recipe {
  return withSlot(recipe, slotId, (slot) => ({
    ...slot,
    optional,
    leftOut: optional && slot.leftOut,
  }))
}
