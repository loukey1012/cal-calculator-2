import { ApiError } from '../../../lib/errors'
import { supabase } from '../../../lib/supabase'
import { fetchMonthNotes } from '../historyApi'
import type { MonthNote } from '../monthStats'
import type { LoggedFood, MealKcal, WeekDay } from './weekStats'

/** Everything the week page shows beyond the goals. */
export type WeekData = {
  readonly days: readonly WeekDay[]
  readonly meals: readonly MealKcal[]
  readonly foods: readonly LoggedFood[]
  readonly notes: readonly MonthNote[]
}

async function fetchWeekDays(userId: string, first: string, last: string): Promise<WeekDay[]> {
  const { data, error } = await supabase
    .from('daily_totals')
    .select(
      'date, kcal, protein, carbs, fat, fiber, meal_count, kcal_estimated, cheat_day, cheat_meal, alcohol_day, lunch_logged, dinner_logged',
    )
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
    mealCount: row.meal_count ?? 0,
    kcalEstimated: row.kcal_estimated ?? false,
    cheatDay: row.cheat_day ?? false,
    cheatMeal: row.cheat_meal ?? false,
    alcoholDay: row.alcohol_day ?? false,
    lunchLogged: row.lunch_logged ?? false,
    dinnerLogged: row.dinner_logged ?? false,
  }))
}

/** The calories of each meal that has food in it. */
async function fetchMealKcal(userId: string, first: string, last: string): Promise<MealKcal[]> {
  const { data, error } = await supabase
    .from('meal_totals')
    .select('date, meal_type, kcal, item_count')
    .eq('user_id', userId)
    .gte('date', first)
    .lte('date', last)
  if (error) throw ApiError.from(error)
  return data.flatMap((row) =>
    row.date && row.meal_type && (row.item_count ?? 0) > 0
      ? [{ date: row.date, mealType: row.meal_type, kcal: row.kcal ?? 0 }]
      : [],
  )
}

async function fetchFoods(userId: string, first: string, last: string): Promise<LoggedFood[]> {
  const { data, error } = await supabase
    .from('meals')
    .select('date, meal_items(name)')
    .eq('user_id', userId)
    .gte('date', first)
    .lte('date', last)
  if (error) throw ApiError.from(error)
  return data.flatMap((meal) =>
    meal.meal_items.map((item) => ({ date: meal.date, name: item.name })),
  )
}

/** The days of a week (or any short range) with what the week page needs of them. */
export async function fetchWeekData(
  userId: string,
  first: string,
  last: string,
): Promise<WeekData> {
  const [days, meals, foods, notes] = await Promise.all([
    fetchWeekDays(userId, first, last),
    fetchMealKcal(userId, first, last),
    fetchFoods(userId, first, last),
    fetchMonthNotes(userId, first, last),
  ])
  return { days, meals, foods, notes }
}
