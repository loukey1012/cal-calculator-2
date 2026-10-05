import type { DayMeal, MealItem } from './dayModel'

export function mealItem(overrides: Partial<MealItem>): MealItem {
  return {
    id: 'item',
    meal_id: 'meal',
    ingredient_id: null,
    name: 'Item',
    brand: null,
    entered_amount: 100,
    entered_unit: 'g',
    basis: 'per_100g',
    basis_multiplier: 1,
    kcal: 100,
    protein: null,
    carbs: null,
    sugar: null,
    fat: null,
    sat_fat: null,
    fiber: null,
    salt: null,
    dish_portion_id: null,
    dish_line_id: null,
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T08:00:00Z',
    ...overrides,
  }
}

export function dayMeal(
  id: string,
  mealType: DayMeal['meal_type'],
  items: readonly MealItem[],
): DayMeal {
  return { id, meal_type: mealType, meal_items: items }
}
