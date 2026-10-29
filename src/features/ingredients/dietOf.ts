import type { Ingredient } from './ingredientsApi'

/** Which diet marks a dish or meal gets. */
type Diet = { readonly vegan: boolean; readonly halal: boolean }

const NO_DIET: Diet = { vegan: false, halal: false }

/**
 * A mark only when EVERY ingredient has it: an empty list, an unknown ingredient, an ingredient
 * without the mark or a custom item (`null`) means no mark.
 */
export function dietOf(
  ingredientIds: ReadonlyArray<string | null>,
  byId: ReadonlyMap<string, Pick<Ingredient, 'vegan' | 'halal'>>,
): Diet {
  if (ingredientIds.length === 0) return NO_DIET
  const found = ingredientIds.map((id) => (id === null ? undefined : byId.get(id)))
  return {
    vegan: found.every((item) => item?.vegan === true),
    halal: found.every((item) => item?.halal === true),
  }
}
