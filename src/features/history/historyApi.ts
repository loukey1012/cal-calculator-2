import { ApiError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import type { DayTotal } from './calendar'

/** Totals per day of one person between two local dates (inclusive), from the daily_totals view. */
export async function fetchDailyTotals(
  userId: string,
  first: string,
  last: string,
): Promise<DayTotal[]> {
  const { data, error } = await supabase
    .from('daily_totals')
    .select(
      'date, kcal, protein, meal_count, kcal_estimated, cheat_day, cheat_meal, alcohol_day, lunch_logged, dinner_logged',
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
    mealCount: row.meal_count ?? 0,
    kcalEstimated: row.kcal_estimated ?? false,
    cheatDay: row.cheat_day ?? false,
    cheatMeal: row.cheat_meal ?? false,
    alcoholDay: row.alcohol_day ?? false,
    lunchLogged: row.lunch_logged ?? false,
    dinnerLogged: row.dinner_logged ?? false,
  }))
}

/** The days between two local dates (inclusive) that have a day note or a note on a meal. */
export async function fetchNoteDates(
  userId: string,
  first: string,
  last: string,
): Promise<string[]> {
  const [dayNotes, meals] = await Promise.all([
    supabase
      .from('day_notes')
      .select('date')
      .eq('user_id', userId)
      .gte('date', first)
      .lte('date', last),
    supabase
      .from('meals')
      .select('date, note')
      .eq('user_id', userId)
      .not('note', 'is', null)
      .gte('date', first)
      .lte('date', last),
  ])
  if (dayNotes.error) throw ApiError.from(dayNotes.error)
  if (meals.error) throw ApiError.from(meals.error)
  const withMealNote = meals.data.filter((meal) => meal.note)
  return [...new Set([...dayNotes.data, ...withMealNote].map((row) => row.date))].toSorted()
}
