import { ApiError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import { MEAL_TYPES, type MealType } from '../meals/dayModel'
import type { DayTotal } from './calendar'
import type { MonthNote } from './monthStats'

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

const mealOrder = (type: MealType | null) =>
  type === null ? -1 : MEAL_TYPES.findIndex((meal) => meal.type === type)

/**
 * The notes (on a day or on a meal) of the days between two local dates (inclusive), by date:
 * the day's own note first, then its meals' notes in meal order.
 */
export async function fetchMonthNotes(
  userId: string,
  first: string,
  last: string,
): Promise<MonthNote[]> {
  const [dayNotes, meals] = await Promise.all([
    supabase
      .from('day_notes')
      .select('date, note')
      .eq('user_id', userId)
      .gte('date', first)
      .lte('date', last),
    supabase
      .from('meals')
      .select('date, meal_type, note')
      .eq('user_id', userId)
      .not('note', 'is', null)
      .gte('date', first)
      .lte('date', last),
  ])
  if (dayNotes.error) throw ApiError.from(dayNotes.error)
  if (meals.error) throw ApiError.from(meals.error)
  const notes: MonthNote[] = [
    ...dayNotes.data.map((row) => ({ date: row.date, mealType: null, text: row.note.trim() })),
    ...meals.data.map((row) => ({
      date: row.date,
      mealType: row.meal_type,
      text: (row.note ?? '').trim(),
    })),
  ]
  return notes
    .filter((note) => note.text !== '')
    .toSorted(
      (a, b) => a.date.localeCompare(b.date) || mealOrder(a.mealType) - mealOrder(b.mealType),
    )
}
