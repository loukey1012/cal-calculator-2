import { ApiError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import { weightFromRow, type WeightEntry } from './weight'

/** All of a person's weights, oldest first (a few hundred at most). */
export async function fetchWeights(userId: string): Promise<WeightEntry[]> {
  const { data, error } = await supabase
    .from('weight_entries')
    .select('date, weight_kg')
    .eq('user_id', userId)
    .order('date')
  if (error) throw ApiError.from(error)
  return data.map(weightFromRow)
}

/** The day's weight; saving the same day again replaces it, so resending is safe. */
export async function saveWeight(userId: string, entry: WeightEntry): Promise<void> {
  const { error } = await supabase
    .from('weight_entries')
    .upsert(
      { user_id: userId, date: entry.date, weight_kg: entry.weightKg },
      { onConflict: 'user_id,date' },
    )
  if (error) throw ApiError.from(error)
}

export async function deleteWeight(userId: string, date: string): Promise<void> {
  const { error } = await supabase
    .from('weight_entries')
    .delete()
    .eq('user_id', userId)
    .eq('date', date)
  if (error) throw ApiError.from(error)
}
