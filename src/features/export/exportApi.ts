import { allRows } from '../../lib/allRows'
import { supabase } from '../../lib/supabase'
import type { ExportData } from './exportRows'

type Person = ExportData['people'][number]

const ITEM_COLUMNS =
  'name, brand, entered_amount, entered_unit, basis_multiplier, kcal, protein, carbs, sugar, fat, sat_fat, fiber, salt, dish_portions(dishes(kcal_estimated))'
const TOTAL_COLUMNS =
  'user_id, date, kcal, protein, carbs, sugar, fat, sat_fat, fiber, salt, kcal_estimated, cheat_day, cheat_meal'

type ItemRow = Omit<ExportData['meals'][number]['meal_items'][number], 'estimated'> & {
  readonly dish_portions: { readonly dishes: { readonly kcal_estimated: boolean } | null } | null
}

/** Everything the export files need for these people and days (from and to included). */
export async function fetchExportData(
  people: readonly Person[],
  from: string,
  to: string,
): Promise<ExportData> {
  const ids = people.map(({ id }) => id)
  const [meals, days, weights] = await Promise.all([
    allRows((first, last) =>
      supabase
        .from('meals')
        .select(`id, user_id, date, meal_type, meal_items(${ITEM_COLUMNS})`)
        .in('user_id', ids)
        .gte('date', from)
        .lte('date', to)
        .order('date')
        .order('id')
        .order('created_at', { referencedTable: 'meal_items' })
        .range(first, last),
    ),
    allRows((first, last) =>
      supabase
        .from('daily_totals')
        .select(TOTAL_COLUMNS)
        .in('user_id', ids)
        .gte('date', from)
        .lte('date', to)
        .order('date')
        .order('user_id')
        .range(first, last),
    ),
    allRows((first, last) =>
      supabase
        .from('weight_entries')
        .select('user_id, date, weight_kg')
        .in('user_id', ids)
        .gte('date', from)
        .lte('date', to)
        .order('date')
        .order('user_id')
        .range(first, last),
    ),
  ])
  return {
    people,
    meals: meals.map(({ id: _id, ...meal }) => ({
      ...meal,
      meal_items: (meal.meal_items as unknown as ItemRow[]).map(({ dish_portions, ...item }) => ({
        ...item,
        estimated: dish_portions?.dishes?.kcal_estimated ?? false,
      })),
    })),
    days: days as unknown as ExportData['days'],
    weights,
  }
}
