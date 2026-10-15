import type { Tables } from '../../lib/database.types'
import { ApiError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import type { Eater } from '../dishes/portions'
import type { MealItemDraft } from '../nutrition/fromIngredient'

/** A plain food (not from a dish) logged with an ingredient, and the meal it is in. */
export type RecentItem = {
  readonly id: string
  readonly item: MealItemDraft
  readonly meal: Eater
}

type ItemRow = Tables<'meal_items'> & {
  readonly meals: Pick<Tables<'meals'>, 'user_id' | 'date' | 'meal_type'>
}

function recentItemFromRow({ meals, ...row }: ItemRow): RecentItem {
  return {
    id: row.id,
    item: {
      ingredient_id: row.ingredient_id,
      name: row.name,
      brand: row.brand,
      entered_amount: row.entered_amount,
      entered_unit: row.entered_unit,
      basis: row.basis,
      basis_multiplier: row.basis_multiplier,
      kcal: row.kcal,
      fat: row.fat,
      sat_fat: row.sat_fat,
      carbs: row.carbs,
      sugar: row.sugar,
      fiber: row.fiber,
      protein: row.protein,
      salt: row.salt,
    },
    meal: { userId: meals.user_id, date: meals.date, mealType: meals.meal_type },
  }
}

/** Plain food logged with the ingredient on `since` or later, by anyone in the household (RLS). */
export async function fetchRecentItems(ingredientId: string, since: string): Promise<RecentItem[]> {
  const { data, error } = await supabase
    .from('meal_items')
    .select('*, meals!inner(user_id, date, meal_type)')
    .eq('ingredient_id', ingredientId)
    .is('dish_portion_id', null)
    .gte('meals.date', since)
  if (error) throw ApiError.from(error)
  return data.map(recentItemFromRow)
}

/** Dishes with the ingredient in a line that someone ate on `since` or later. */
export async function fetchRecentDishIds(ingredientId: string, since: string): Promise<string[]> {
  const lines = await supabase
    .from('dish_lines')
    .select('dish_id')
    .eq('ingredient_id', ingredientId)
  if (lines.error) throw ApiError.from(lines.error)
  const dishIds = [...new Set(lines.data.map((row) => row.dish_id))]
  if (dishIds.length === 0) return []

  const portions = await supabase
    .from('dish_portions')
    .select('dish_id')
    .in('dish_id', dishIds)
    .gte('date', since)
  if (portions.error) throw ApiError.from(portions.error)
  return [...new Set(portions.data.map((row) => row.dish_id))]
}

/** Replaces the values a plain food was logged with. */
export async function updateItemValues(id: string, values: MealItemDraft): Promise<void> {
  const { error } = await supabase.from('meal_items').update(values).eq('id', id)
  if (error) throw ApiError.from(error)
}
