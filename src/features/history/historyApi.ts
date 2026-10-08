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
    .select('date, kcal, protein, meal_count, kcal_estimated')
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
  }))
}
