import { ApiError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import { MEAL_TYPES, type MealType } from '../meals/dayModel'
import type { DayTotal } from './calendar'
import type { MonthNote } from './monthStats'

// the API returns at most this many rows per request; a full page may have more behind it
const PAGE_SIZE = 1000

const DAILY_TOTALS_COLUMNS =
  'date, kcal, protein, meal_count, kcal_estimated, cheat_day, cheat_meal, alcohol_day, lunch_logged, dinner_logged'

async function fetchTotalsPage(userId: string, range: DateRange, from: number) {
  const { data, error } = await supabase
    .from('daily_totals')
    .select(DAILY_TOTALS_COLUMNS)
    .eq('user_id', userId)
    .gte('date', range.first)
    .lte('date', range.last)
    .order('date')
    .range(from, from + PAGE_SIZE - 1)
  if (error) throw ApiError.from(error)
  return data
}

/**
 * Totals per day of one person between two local dates (inclusive), by date, from the
 * daily_totals view. A long range is read page by page, as long as a page comes back full.
 */
export async function fetchDailyTotals(
  userId: string,
  first: string,
  last: string,
): Promise<DayTotal[]> {
  const rows: Awaited<ReturnType<typeof fetchTotalsPage>> = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = await fetchTotalsPage(userId, { first, last }, from)
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  // view columns are nullable in the generated types; aggregates are never null in practice
  return rows.map((row) => ({
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

type DateRange = { readonly first: string; readonly last: string }

const mealOrder = (type: MealType | null) =>
  type === null ? -1 : MEAL_TYPES.findIndex((meal) => meal.type === type)

/** Every non-blank day note and meal note, in no particular order; `range` null reads them all. */
async function fetchNotes(userId: string, range: DateRange | null): Promise<MonthNote[]> {
  const dayNotesQuery = supabase.from('day_notes').select('date, note').eq('user_id', userId)
  const mealsQuery = supabase
    .from('meals')
    .select('date, meal_type, note')
    .eq('user_id', userId)
    .not('note', 'is', null)
  // reading everything can hit the row cap: newest first, so a cut loses the oldest notes
  const [dayNotes, meals] = await Promise.all([
    range
      ? dayNotesQuery.gte('date', range.first).lte('date', range.last)
      : dayNotesQuery.order('date', { ascending: false }),
    range
      ? mealsQuery.gte('date', range.first).lte('date', range.last)
      : mealsQuery.order('date', { ascending: false }),
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
  return notes.filter((note) => note.text !== '')
}

const byMealOrder = (a: MonthNote, b: MonthNote) => mealOrder(a.mealType) - mealOrder(b.mealType)

/**
 * The notes (on a day or on a meal) of the days between two local dates (inclusive), by date:
 * the day's own note first, then its meals' notes in meal order.
 */
export async function fetchMonthNotes(
  userId: string,
  first: string,
  last: string,
): Promise<MonthNote[]> {
  const notes = await fetchNotes(userId, { first, last })
  return notes.toSorted((a, b) => a.date.localeCompare(b.date) || byMealOrder(a, b))
}

/** Every note of the person, the newest day first; within a day as in `fetchMonthNotes`. */
export async function fetchAllNotes(userId: string): Promise<MonthNote[]> {
  const notes = await fetchNotes(userId, null)
  return notes.toSorted((a, b) => b.date.localeCompare(a.date) || byMealOrder(a, b))
}
