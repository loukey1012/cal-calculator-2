import { ApiError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import type { CategoryGroup } from '../ingredients/ingredientsApi'

// creating a category lives in ingredientsApi (createCategory): the ingredient form needs it too

export async function createCategoryGroup(
  householdId: string,
  name: string,
): Promise<CategoryGroup> {
  const { data, error } = await supabase
    .from('category_groups')
    .insert({ household_id: householdId, name })
    .select()
    .single()
  if (error) throw ApiError.from(error)
  return data
}

export async function renameCategoryGroup(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('category_groups').update({ name }).eq('id', id)
  if (error) throw ApiError.from(error)
}

/** Only an empty one: the database refuses while categories are still in it. */
export async function deleteCategoryGroup(id: string): Promise<void> {
  const { error } = await supabase.from('category_groups').delete().eq('id', id)
  if (error) throw ApiError.from(error)
}

export type CategoryChange = { readonly name: string; readonly groupId: string }

/** Renames a category and/or moves it to another broad category. */
export async function updateCategory(id: string, { name, groupId }: CategoryChange): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update({ name, group_id: groupId })
    .eq('id', id)
  if (error) throw ApiError.from(error)
}

/** Only an empty one: the database refuses while ingredients are still in it. */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw ApiError.from(error)
}
