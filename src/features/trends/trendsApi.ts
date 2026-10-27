import { allRows } from '../../lib/allRows'
import { supabase } from '../../lib/supabase'
import type { NutritionDay } from './trends'

/**
 * A person's totals per day between two local dates (inclusive), from the daily_totals view,
 * page by page: a long range (e.g. every week ever) can have more days than one request returns.
 */
export async function fetchNutritionDays(
  userId: string,
  first: string,
  last: string,
): Promise<NutritionDay[]> {
  const data = await allRows((from, to) =>
    supabase
      .from('daily_totals')
      .select(
        'date, kcal, protein, carbs, fat, fiber, kcal_estimated, meal_count, cheat_day, cheat_meal, alcohol_day, lunch_logged, dinner_logged',
      )
      .eq('user_id', userId)
      .gte('date', first)
      .lte('date', last)
      .order('date')
      .range(from, to),
  )
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
    cheatDay: row.cheat_day ?? false,
    cheatMeal: row.cheat_meal ?? false,
    alcoholDay: row.alcohol_day ?? false,
    lunchLogged: row.lunch_logged ?? false,
    dinnerLogged: row.dinner_logged ?? false,
  }))
}
