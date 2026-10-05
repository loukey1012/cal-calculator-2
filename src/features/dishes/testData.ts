import type { MealItemDraft } from '../nutrition/fromIngredient'
import type { Dish, DishLine, Eater } from './portions'

export const DAY = '2026-10-05'
export const ME_LUNCH: Eater = { userId: 'me', date: DAY, mealType: 'lunch' }
export const HER_LUNCH: Eater = { userId: 'her', date: DAY, mealType: 'lunch' }

/** A per-100g snapshot of `grams` of something. */
export function gramsItem(name: string, grams: number, kcalPer100: number): MealItemDraft {
  return {
    ingredient_id: null,
    name,
    brand: null,
    entered_amount: grams,
    entered_unit: 'g',
    basis: 'per_100g',
    basis_multiplier: grams / 100,
    kcal: kcalPer100,
    protein: 10,
    carbs: null,
    sugar: null,
    fat: null,
    sat_fat: null,
    fiber: null,
    salt: null,
  }
}

export function sharedLine(id: string, name: string, grams: number, kcalPer100: number): DishLine {
  return { id, allocation: 'shared', item: gramsItem(name, grams, kcalPer100), amounts: {} }
}

/** Chili for two, split equally: 400 g mince. */
export function testDish(overrides: Partial<Dish> = {}): Dish {
  return {
    id: 'dish-1',
    name: 'Chili',
    splitMode: 'equal',
    cookedWeightG: null,
    revision: 'rev-1',
    portions: [
      { id: 'p-me', eater: ME_LUNCH, splitValue: null },
      { id: 'p-her', eater: HER_LUNCH, splitValue: null },
    ],
    lines: [sharedLine('l-mince', 'Mince', 400, 250)],
    ...overrides,
  }
}
