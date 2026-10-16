import type { Enums, Tables } from '../../lib/database.types'
import { ApiError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import type { Ingredient } from '../ingredients/ingredientsApi'
import type { IngredientPatch } from './suggestion'

/**
 * Something the weekly review routine found, about an ingredient or about a person's day (see
 * the ingredient_review and review_meals migrations).
 */
export type Finding = Tables<'review_findings'>
export type FindingKind = Enums<'finding_kind'>
export type FindingDecision = Exclude<Enums<'finding_status'>, 'open'>

export async function fetchOpenFindings(householdId: string): Promise<Finding[]> {
  const { data, error } = await supabase
    .from('review_findings')
    .select('*')
    .eq('household_id', householdId)
    .eq('status', 'open')
    .order('created_at')
  if (error) throw ApiError.from(error)
  return data
}

/** Applied or ignored, by whom and when; either member can decide. */
export async function decideFinding(
  id: string,
  status: FindingDecision,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('review_findings')
    .update({ status, decided_by: userId, decided_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw ApiError.from(error)
}

/** Changes only the given fields of an ingredient, e.g. a finding's fix. */
export async function patchIngredient(id: string, patch: IngredientPatch): Promise<Ingredient> {
  const { data, error } = await supabase
    .from('ingredients')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw ApiError.from(error)
  return data
}
