import type { Tables } from '../../lib/database.types'
import { ApiError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import type { DishLine } from '../dishes/portions'
import { itemDraftOf } from '../nutrition/fromIngredient'
import type { Recipe, RecipeSlot } from './recipeModel'

type PortionRow = Tables<'recipe_portions'>
type AmountRow = Tables<'recipe_line_amounts'>
type LineRow = Tables<'recipe_lines'> & { readonly recipe_line_amounts: readonly AmountRow[] }
type RecipeRow = Tables<'recipes'> & {
  readonly recipe_portions: readonly PortionRow[]
  readonly recipe_lines: readonly LineRow[]
}

const RECIPE_COLUMNS = '*, recipe_portions(*), recipe_lines(*, recipe_line_amounts(*))'

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position

function lineFromRow(row: LineRow): DishLine {
  const amounts = Object.fromEntries(
    row.recipe_line_amounts.map((entry) => [entry.portion_id, entry.amount]),
  )
  return { id: row.id, allocation: row.allocation, item: itemDraftOf(row), amounts }
}

/** The rows of one line (slot) are its choices; the picked row says what the slot remembers. */
function slotsFromRows(rows: readonly LineRow[]): RecipeSlot[] {
  const slotIds = [...new Set(rows.map((row) => row.slot_id))]
  return slotIds.flatMap((slotId) => {
    const choices = rows.filter((row) => row.slot_id === slotId)
    const picked = choices.find((row) => row.picked) ?? choices[0]
    if (!picked) return []
    return [
      {
        id: slotId,
        optional: picked.optional,
        leftOut: picked.left_out,
        pickedId: picked.id,
        choices: choices.map(lineFromRow),
      },
    ]
  })
}

function recipeFromRow(row: RecipeRow): Recipe {
  return {
    id: row.id,
    name: row.name,
    splitMode: row.split_mode,
    cookedWeightG: row.cooked_weight_g,
    kcalEstimated: row.kcal_estimated,
    portions: row.recipe_portions.toSorted(byPosition).map((portion) => ({
      id: portion.id,
      userId: portion.user_id,
      splitValue: portion.split_value,
    })),
    slots: slotsFromRows(row.recipe_lines.toSorted(byPosition)),
  }
}

/** The recipe as save_recipe expects it (positions follow the array order). */
function recipePayload(recipe: Recipe) {
  return {
    id: recipe.id,
    name: recipe.name,
    split_mode: recipe.splitMode,
    cooked_weight_g: recipe.cookedWeightG,
    kcal_estimated: recipe.kcalEstimated,
    portions: recipe.portions.map((portion) => ({
      id: portion.id,
      user_id: portion.userId,
      split_value: portion.splitValue,
    })),
    // every choice is a line; the slot's flags go on each of them
    lines: recipe.slots.flatMap((slot) =>
      slot.choices.map((choice) => ({
        ...choice.item,
        id: choice.id,
        slot_id: slot.id,
        optional: slot.optional,
        picked: choice.id === slot.pickedId,
        left_out: slot.leftOut,
        allocation: choice.allocation,
        amounts: Object.entries(choice.amounts).map(([portion_id, amount]) => ({
          portion_id,
          amount,
        })),
      })),
    ),
  }
}

/** The household's recipes, by name. */
export async function fetchRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase.from('recipes').select(RECIPE_COLUMNS).order('name')
  if (error) throw ApiError.from(error)
  return data.map(recipeFromRow)
}

/** Creates the recipe, or replaces the one with its id. */
export async function saveRecipe(recipe: Recipe): Promise<void> {
  const { error } = await supabase.rpc('save_recipe', { p_recipe: recipePayload(recipe) })
  if (error) throw ApiError.from(error)
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_recipe', { p_recipe_id: recipeId })
  if (error) throw ApiError.from(error)
}
