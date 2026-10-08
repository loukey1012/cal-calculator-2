import { ApiError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import type { NutritionDay } from './trends'

/** A person's totals per day between two local dates (inclusive), from the daily_totals view. */
export async function fetchNutritionDays(
  userId: string,
  first: string,
  last: string,
): Promise<NutritionDay[]> {
  const { data, error } = await supabase
    .from('daily_totals')
    .select('date, kcal, protein, carbs, fat, fiber, kcal_estimated, meal_count')
    .eq('user_id', userId)
    .gte('date', first)
    .lte('date', last)
  if (error) throw ApiError.from(error)
  // view columns are nullable in the generated types; aggregates are never null in practice
  return data.map((row) => ({
    date: row.date ?? '',
    kcal: row.kcal ?? 0,
    protein: row.protein ?? 0,
    carbs: row.carbs ?? 0,
    fat: row.fat ?? 0,
    fiber: row.fiber ?? 0,
    estimated: row.kcal_estimated ?? false,
    mealCount: row.meal_count ?? 0,
  }))
}
