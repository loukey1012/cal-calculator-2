import type { Dish } from './portions'

/** Why the dish can't be saved while ingredients wait for their amount, or null. */
function toWeighError(dish: Dish): string | null {
  const count = dish.toWeigh?.length ?? 0
  if (count === 0) return null
  return `Weigh ${count} ${count === 1 ? 'ingredient' : 'ingredients'} first`
}

/** Why the dish can't be saved yet, or null. The split itself is checked when saving. */
export function saveError(dish: Dish): string | null {
  const unweighed = toWeighError(dish)
  if (unweighed) return unweighed
  if (dish.lines.length === 0) return 'Add at least one ingredient'
  if (!dish.portions.some((portion) => portion.eater)) return 'Choose who eats'
  return null
}
