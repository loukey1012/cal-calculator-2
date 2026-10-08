import type { Enums, Tables } from '../../lib/database.types'
import { roundTo } from '../../lib/numbers'

export type MealType = Enums<'meal_type'>
/**
 * The dish a cooked portion's item belongs to (name for display, id to open it). The counts may
 * be missing in data cached by older versions.
 */
export type DishRef = {
  readonly id: string
  readonly name: string | null
  /** every portion, leftovers included */
  readonly portionCount?: number
  /** portions someone has eaten */
  readonly eaterCount?: number
  /** the dish's calories are only roughly known */
  readonly kcalEstimated?: boolean
}

/** `dish` is set for items of a cooked dish; it may be missing in data cached by older versions. */
export type MealItem = Tables<'meal_items'> & { readonly dish?: DishRef | null }

/** One meal of a day as loaded for the Today screen. */
export type DayMeal = {
  readonly id: string
  readonly meal_type: MealType
  readonly meal_items: readonly MealItem[]
}

export type AmountPatch = { readonly entered_amount: number; readonly basis_multiplier: number }

export const MEAL_TYPES: ReadonlyArray<{ readonly type: MealType; readonly label: string }> = [
  { type: 'breakfast', label: 'Breakfast' },
  { type: 'lunch', label: 'Lunch' },
  { type: 'dinner', label: 'Dinner' },
  { type: 'snack', label: 'Snacks' },
]

/** shown on food of a dish whose calories are only roughly known */
export const ESTIMATE_LABEL = 'Estimate'

// match meal_items numeric(10, 4) and numeric(9, 2)
const MULTIPLIER_DECIMALS = 4
const AMOUNT_DECIMALS = 2

/**
 * What a meal lists: plain items (logged before the Cook tab), single foods (a dish of one
 * unnamed food logged alone, shown like a plain item) and each other dish's portion as one entry.
 */
export type MealEntry =
  | { readonly kind: 'item'; readonly item: MealItem }
  | { readonly kind: 'food'; readonly item: MealItem; readonly dishId: string }
  | { readonly kind: 'dish'; readonly portionId: string; readonly items: readonly MealItem[] }

function singleFood(items: readonly MealItem[]): MealEntry | null {
  const [item] = items
  const dish = item?.dish
  if (items.length !== 1 || !item || !dish) return null
  if (dish.name !== null || dish.portionCount !== 1) return null
  return { kind: 'food', item, dishId: dish.id }
}

/** Plain items as they are; a dish's items as one entry, where its first item was. */
export function mealEntries(items: readonly MealItem[]): MealEntry[] {
  return items.flatMap((item): MealEntry[] => {
    const portionId = item.dish_portion_id
    if (portionId === null) return [{ kind: 'item', item }]
    const first = items.find((candidate) => candidate.dish_portion_id === portionId)
    if (first !== item) return []
    const portion = items.filter((candidate) => candidate.dish_portion_id === portionId)
    return [singleFood(portion) ?? { kind: 'dish', portionId, items: portion }]
  })
}

export function mealLabel(type: MealType): string {
  return MEAL_TYPES.find((meal) => meal.type === type)?.label ?? type
}

export function itemsByMeal(
  meals: readonly DayMeal[],
): Readonly<Record<MealType, readonly MealItem[]>> {
  const itemsOf = (type: MealType) =>
    meals.filter((meal) => meal.meal_type === type).flatMap((meal) => meal.meal_items)
  return {
    breakfast: itemsOf('breakfast'),
    lunch: itemsOf('lunch'),
    dinner: itemsOf('dinner'),
    snack: itemsOf('snack'),
  }
}

/**
 * New amount in the unit it was logged in. The multiplier scales proportionally, which works
 * for every basis (e.g. grams of a per-unit bar) without needing the ingredient again.
 */
export function scaleItemAmount(
  item: Pick<MealItem, 'basis_multiplier' | 'entered_amount'>,
  newAmount: number,
): AmountPatch {
  if (!Number.isFinite(newAmount) || newAmount <= 0) {
    throw new RangeError('Amount must be a positive number')
  }
  // scale with the amount as stored, so amount and multiplier always agree
  const amount = roundTo(newAmount, AMOUNT_DECIMALS)
  const multiplier = roundTo(
    (item.basis_multiplier * amount) / item.entered_amount,
    MULTIPLIER_DECIMALS,
  )
  if (multiplier <= 0) throw new RangeError('Amount is too small to log')
  return { entered_amount: amount, basis_multiplier: multiplier }
}

/** e.g. "150 g", "1 unit", "2,5 units" */
export function describeAmount(
  item: Pick<MealItem, 'entered_amount' | 'entered_unit'>,
  locale?: string,
): string {
  const amount = new Intl.NumberFormat(locale, { maximumFractionDigits: AMOUNT_DECIMALS }).format(
    item.entered_amount,
  )
  if (item.entered_unit === 'g') return `${amount} g`
  return `${amount} ${item.entered_amount === 1 ? 'unit' : 'units'}`
}

// ─── immutable cache updates for optimistic UI ───────────────────────────────

export function withItemAdded(
  meals: readonly DayMeal[],
  mealType: MealType,
  item: MealItem,
): DayMeal[] {
  const existing = meals.find((meal) => meal.meal_type === mealType)
  if (!existing) {
    const pendingId = `pending-${mealType}`
    return [
      ...meals,
      { id: pendingId, meal_type: mealType, meal_items: [{ ...item, meal_id: pendingId }] },
    ]
  }
  return meals.map((meal) =>
    meal === existing
      ? { ...meal, meal_items: [...meal.meal_items, { ...item, meal_id: meal.id }] }
      : meal,
  )
}

export function withItemUpdated(
  meals: readonly DayMeal[],
  itemId: string,
  patch: AmountPatch,
): DayMeal[] {
  return meals.map((meal) => ({
    ...meal,
    meal_items: meal.meal_items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
  }))
}

export function withItemRemoved(meals: readonly DayMeal[], itemId: string): DayMeal[] {
  return meals.map((meal) => ({
    ...meal,
    meal_items: meal.meal_items.filter((item) => item.id !== itemId),
  }))
}
