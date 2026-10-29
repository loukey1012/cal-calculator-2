import { ApiError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'

/** Whether the person marked the day as a gym day. */
export async function fetchGymDay(userId: string, date: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('gym_days')
    .select('date')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()
  if (error) throw ApiError.from(error)
  return data !== null
}

/** Whether the household marked the day as a sex day. */
export async function fetchSexDay(householdId: string, date: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('sex_days')
    .select('date')
    .eq('household_id', householdId)
    .eq('date', date)
    .maybeSingle()
  if (error) throw ApiError.from(error)
  return data !== null
}

/** Sets or takes back a gym day; both can be sent again safely. */
export async function setGymDay(userId: string, date: string, on: boolean): Promise<void> {
  const { error } = on
    ? await supabase
        .from('gym_days')
        .upsert({ user_id: userId, date }, { onConflict: 'user_id,date', ignoreDuplicates: true })
    : await supabase.from('gym_days').delete().eq('user_id', userId).eq('date', date)
  if (error) throw ApiError.from(error)
}

/** Sets or takes back a sex day; both can be sent again safely. */
export async function setSexDay(householdId: string, date: string, on: boolean): Promise<void> {
  const { error } = on
    ? await supabase
        .from('sex_days')
        .upsert(
          { household_id: householdId, date },
          { onConflict: 'household_id,date', ignoreDuplicates: true },
        )
    : await supabase.from('sex_days').delete().eq('household_id', householdId).eq('date', date)
  if (error) throw ApiError.from(error)
}

/** The person's gym days between two local dates (inclusive). */
export async function fetchGymDates(
  userId: string,
  first: string,
  last: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('gym_days')
    .select('date')
    .eq('user_id', userId)
    .gte('date', first)
    .lte('date', last)
  if (error) throw ApiError.from(error)
  return data.map((row) => row.date)
}

/** The household's sex days between two local dates (inclusive). */
export async function fetchSexDates(
  householdId: string,
  first: string,
  last: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('sex_days')
    .select('date')
    .eq('household_id', householdId)
    .gte('date', first)
    .lte('date', last)
  if (error) throw ApiError.from(error)
  return data.map((row) => row.date)
}
