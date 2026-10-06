import type { Dish } from './portions'

/** Why the dish can't be saved yet, or null. The split itself is checked when saving. */
export function saveError(dish: Dish): string | null {
  if (dish.lines.length === 0) return 'Add at least one ingredient'
  if (!dish.portions.some((portion) => portion.eater)) return 'Choose who eats'
  return null
}
