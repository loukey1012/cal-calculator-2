import type { Tables, TablesInsert } from '../../lib/database.types'
import { ApiError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'

export type Ingredient = Tables<'ingredients'>
export type Category = Tables<'categories'>
/** A broad category ("Fresh") holding categories ("Meat & Fish"); editable per household. */
export type CategoryGroup = Tables<'category_groups'>

/** The columns a user edits; ownership and bookkeeping columns are set by the database. */
export type IngredientInput = Omit<
  TablesInsert<'ingredients'>,
  'id' | 'household_id' | 'created_by' | 'created_at' | 'updated_at' | 'legacy_id'
>

export async function fetchIngredients(householdId: string): Promise<Ingredient[]> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .eq('household_id', householdId)
    .order('name')
  if (error) throw ApiError.from(error)
  return data
}

export async function fetchCategories(householdId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('household_id', householdId)
    .order('name')
  if (error) throw ApiError.from(error)
  return data
}

export async function fetchCategoryGroups(householdId: string): Promise<CategoryGroup[]> {
  const { data, error } = await supabase
    .from('category_groups')
    .select('*')
    .eq('household_id', householdId)
    .order('name')
  if (error) throw ApiError.from(error)
  return data
}

export async function createIngredient(
  householdId: string,
  input: IngredientInput,
): Promise<Ingredient> {
  const { data, error } = await supabase
    .from('ingredients')
    .insert({ ...input, household_id: householdId })
    .select()
    .single()
  if (error) throw ApiError.from(error)
  return data
}

export async function updateIngredient(id: string, input: IngredientInput): Promise<Ingredient> {
  const { data, error } = await supabase
    .from('ingredients')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw ApiError.from(error)
  return data
}

/** Gives an ingredient a (new) package barcode, e.g. one scanned for it later. */
export async function setIngredientBarcode(id: string, barcode: string): Promise<Ingredient> {
  const { data, error } = await supabase
    .from('ingredients')
    .update({ barcode })
    .eq('id', id)
    .select()
    .single()
  if (error) throw ApiError.from(error)
  return data
}

/** Logged meals keep their nutrition snapshot; their link to the ingredient is cleared. */
export async function deleteIngredient(id: string): Promise<void> {
  const { error } = await supabase.from('ingredients').delete().eq('id', id)
  if (error) throw ApiError.from(error)
}

/** `groupId` null leaves the category ungrouped ("Other"). */
export async function createCategory(
  householdId: string,
  name: string,
  groupId: string | null,
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ household_id: householdId, name, group_id: groupId })
    .select()
    .single()
  if (error) throw ApiError.from(error)
  return data
}
