import type { Tables } from '../../lib/database.types'
import { ApiError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import type { MealItemDraft } from '../nutrition/fromIngredient'
import type { Dish, DishLine, DishPortion } from './portions'

type PortionRow = Tables<'dish_portions'>
type LineRow = Tables<'dish_lines'> & { readonly dish_line_amounts: readonly AmountRow[] }
type AmountRow = Tables<'dish_line_amounts'>
type DishRow = Tables<'dishes'> & {
  readonly dish_portions: readonly PortionRow[]
  readonly dish_lines: readonly LineRow[]
}

export type SaveDishInput = {
  /** carries the new revision */
  readonly dish: Dish
  /** the revision the edit started from; null for a new dish */
  readonly baseRevision: string | null
  /** plain meal items this dish takes over ("share this meal") */
  readonly replaceItemIds: readonly string[]
}

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position

function portionFromRow(row: PortionRow): DishPortion {
  const eater =
    row.user_id !== null && row.date !== null && row.meal_type !== null
      ? { userId: row.user_id, date: row.date, mealType: row.meal_type }
      : null
  return {
    id: row.id,
    eater,
    splitValue: row.split_value,
    ...(row.discarded ? { discarded: true } : {}),
  }
}

function lineFromRow(row: LineRow): DishLine {
  const item: MealItemDraft = {
    ingredient_id: row.ingredient_id,
    name: row.name,
    brand: row.brand,
    entered_amount: row.entered_amount,
    entered_unit: row.entered_unit,
    basis: row.basis,
    basis_multiplier: row.basis_multiplier,
    kcal: row.kcal,
    protein: row.protein,
    carbs: row.carbs,
    sugar: row.sugar,
    fat: row.fat,
    sat_fat: row.sat_fat,
    fiber: row.fiber,
    salt: row.salt,
  }
  const amounts = Object.fromEntries(
    row.dish_line_amounts.map((entry) => [entry.portion_id, entry.amount]),
  )
  return { id: row.id, allocation: row.allocation, item, amounts }
}

function dishFromRow(row: DishRow): Dish {
  return {
    id: row.id,
    name: row.name,
    splitMode: row.split_mode,
    cookedWeightG: row.cooked_weight_g,
    kcalEstimated: row.kcal_estimated,
    revision: row.revision,
    portions: row.dish_portions.toSorted(byPosition).map(portionFromRow),
    lines: row.dish_lines.toSorted(byPosition).map(lineFromRow),
  }
}

/** The dish as save_dish expects it (positions follow the array order). */
function dishPayload(dish: Dish) {
  return {
    id: dish.id,
    name: dish.name,
    split_mode: dish.splitMode,
    cooked_weight_g: dish.cookedWeightG,
    kcal_estimated: dish.kcalEstimated ?? false,
    revision: dish.revision,
    portions: dish.portions.map((portion) => ({
      id: portion.id,
      user_id: portion.eater?.userId ?? null,
      date: portion.eater?.date ?? null,
      meal_type: portion.eater?.mealType ?? null,
      split_value: portion.splitValue,
      discarded: portion.discarded ?? false,
    })),
    lines: dish.lines.map((line) => ({
      ...line.item,
      id: line.id,
      allocation: line.allocation,
      amounts: Object.entries(line.amounts).map(([portion_id, amount]) => ({ portion_id, amount })),
    })),
  }
}

const DISH_COLUMNS = '*, dish_portions(*), dish_lines(*, dish_line_amounts(*))'

/** null when the dish doesn't exist (any more). */
export async function fetchDish(dishId: string): Promise<Dish | null> {
  const { data, error } = await supabase
    .from('dishes')
    .select(DISH_COLUMNS)
    .eq('id', dishId)
    .maybeSingle()
  if (error) throw ApiError.from(error)
  return data ? dishFromRow(data) : null
}

/** Dishes cooked since `since` (ISO time) with a portion nobody has eaten or thrown away. */
export async function fetchLeftoverDishes(since: string): Promise<Dish[]> {
  const leftovers = await supabase
    .from('dish_portions')
    .select('dish_id')
    .is('user_id', null)
    .eq('discarded', false)
  if (leftovers.error) throw ApiError.from(leftovers.error)
  const dishIds = [...new Set(leftovers.data.map((row) => row.dish_id))]
  if (dishIds.length === 0) return []

  const { data, error } = await supabase
    .from('dishes')
    .select(DISH_COLUMNS)
    .in('id', dishIds)
    .gte('created_at', since)
    .order('created_at')
  if (error) throw ApiError.from(error)
  return data.map(dishFromRow)
}

export async function saveDish({
  dish,
  baseRevision,
  replaceItemIds,
}: SaveDishInput): Promise<void> {
  const { error } = await supabase.rpc('save_dish', {
    p_dish: dishPayload(dish),
    // left out (the RPC's default, null) for a new dish
    p_base_revision: baseRevision ?? undefined,
    p_replace_item_ids: [...replaceItemIds],
  })
  if (error) throw ApiError.from(error)
}

export async function deleteDish(dishId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_dish', { p_dish_id: dishId })
  if (error) throw ApiError.from(error)
}
