import type { Enums, Tables, Database } from '../../lib/database.types'
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

export type MergeInput = {
  readonly keepId: string
  readonly dropId: string
  /** values taken over from the dropped one */
  readonly patch: IngredientPatch
  /** the duplicate finding this settles; null when merged by hand */
  readonly findingId: string | null
}

type MergeArgs = Omit<Database['public']['Functions']['merge_ingredients']['Args'], 'p_finding'> & {
  /** null when merged by hand: the function accepts it, the generated types don't say so */
  p_finding: string | null
}

/** The merge_ingredients call with its real argument types; the one cast is kept here. */
function callMerge(args: MergeArgs) {
  return supabase.rpc(
    'merge_ingredients',
    args as Database['public']['Functions']['merge_ingredients']['Args'],
  )
}

/** Folds one ingredient into the other in one step (see the merge_ingredients migration). */
export async function mergeIngredients({
  keepId,
  dropId,
  patch,
  findingId,
}: MergeInput): Promise<void> {
  const { error } = await callMerge({
    p_keep: keepId,
    p_drop: dropId,
    p_patch: patch,
    p_finding: findingId,
  })
  if (error) throw ApiError.from(error)
}
