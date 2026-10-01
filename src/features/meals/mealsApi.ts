import { ApiError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import type { MealItemDraft } from '../nutrition/fromIngredient'
import type { AmountPatch, DayMeal, MealType } from './dayModel'

export type AddMealItemInput = {
  /** generated on the device, so retrying the same add can never create a duplicate */
  readonly id: string
  readonly userId: string
  readonly date: string
  readonly mealType: MealType
  readonly draft: MealItemDraft
}

export async function fetchDay(userId: string, date: string): Promise<DayMeal[]> {
  const { data, error } = await supabase
    .from('meals')
    .select('id, meal_type, meal_items(*)')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { referencedTable: 'meal_items' })
  if (error) throw ApiError.from(error)
  return data
}

export async function addMealItem({
  id,
  userId,
  date,
  mealType,
  draft,
}: AddMealItemInput): Promise<void> {
  const { data: mealId, error: mealError } = await supabase.rpc('ensure_meal', {
    p_user_id: userId,
    p_date: date,
    p_meal_type: mealType,
  })
  if (mealError) throw ApiError.from(mealError)

  const { error } = await supabase
    .from('meal_items')
    .upsert({ ...draft, id, meal_id: mealId }, { onConflict: 'id', ignoreDuplicates: true })
  if (error) throw ApiError.from(error)
}

export async function updateMealItem(id: string, patch: AmountPatch): Promise<void> {
  const { error } = await supabase.from('meal_items').update(patch).eq('id', id)
  if (error) throw ApiError.from(error)
}

export async function deleteMealItem(id: string): Promise<void> {
  const { error } = await supabase.from('meal_items').delete().eq('id', id)
  if (error) throw ApiError.from(error)
}
