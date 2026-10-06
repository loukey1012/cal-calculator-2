import type { Dish } from './portions'

const NAMED_INGREDIENTS = 2

/** e.g. "Banana", "Pasta, Pesto", "Pasta, Pesto +2" */
export function autoTitle(names: readonly string[]): string {
  if (names.length === 0) return 'Dish'
  const shown = names.slice(0, NAMED_INGREDIENTS).join(', ')
  const more = names.length - NAMED_INGREDIENTS
  return more > 0 ? `${shown} +${more}` : shown
}

/** Its name, or what went into it. */
export function dishTitle(dish: Pick<Dish, 'name' | 'lines'>): string {
  return dish.name ?? autoTitle(dish.lines.map((line) => line.item.name))
}
