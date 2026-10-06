import { mealTotals } from '../nutrition/totals'
import type { NutritionTotals } from '../nutrition/types'
import { dishTitle } from './dishTitle'
import { isLeftover, portionItems, type Dish } from './portions'

/** One leftover portion that can be eaten (logged into a meal) or thrown away. */
export type LeftoverOffer = {
  readonly dish: Dish
  readonly portionId: string
  readonly title: string
  readonly totals: NutritionTotals
}

function portionTotals(dish: Dish, portionId: string): NutritionTotals {
  try {
    const items = portionItems(dish).find((entry) => entry.portionId === portionId)?.items ?? []
    return mealTotals(items.map(({ draft }) => draft))
  } catch {
    // a dish saved by an older version might not split; show it without numbers
    return mealTotals([])
  }
}

export function leftoverOffers(dishes: readonly Dish[]): LeftoverOffer[] {
  return dishes.flatMap((dish) =>
    dish.portions.filter(isLeftover).map((portion) => ({
      dish,
      portionId: portion.id,
      title: dishTitle(dish),
      totals: portionTotals(dish, portion.id),
    })),
  )
}

/** e.g. "Chili left", "2× Chili left", "3 leftovers" */
export function leftoversLabel(offers: readonly LeftoverOffer[]): string {
  const titles = new Set(offers.map((offer) => offer.title))
  const [only] = titles
  if (titles.size === 1 && only) {
    return offers.length === 1 ? `${only} left` : `${offers.length}× ${only} left`
  }
  return `${offers.length} leftovers`
}
