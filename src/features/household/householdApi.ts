import type { Tables } from '../../lib/database.types'
import { ApiError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'

export type Profile = Tables<'profiles'>
export type Household = Tables<'households'>

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw ApiError.from(error)
  return data
}

export async function fetchHousehold(householdId: string): Promise<Household> {
  const { data, error } = await supabase
    .from('households')
    .select('*')
    .eq('id', householdId)
    .single()
  if (error) throw ApiError.from(error)
  return data
}

export async function fetchMembers(householdId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('household_id', householdId)
    .order('display_name')
  if (error) throw ApiError.from(error)
  return data
}

export async function createHousehold(name: string): Promise<Household> {
  const { data, error } = await supabase.rpc('create_household', { p_name: name })
  if (error) throw ApiError.from(error)
  return data
}

export async function joinHousehold(inviteCode: string): Promise<Household> {
  const { data, error } = await supabase.rpc('join_household', { p_invite_code: inviteCode })
  if (error) throw ApiError.from(error)
  return data
}

/** The profile fields a user may change themselves (the database grants no other columns). */
export type ProfilePatch = Partial<Pick<Profile, 'display_name' | 'accent_color' | 'appearance'>>

export async function updateProfile(userId: string, patch: ProfilePatch): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  if (error) throw ApiError.from(error)
}
