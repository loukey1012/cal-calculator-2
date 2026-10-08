import { ApiError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import type { MealItemDraft } from '../nutrition/fromIngredient'
import type { AmountPatch, DayMeal, DishRef, MealType } from './dayModel'

export type AddMealItemInput = {
  /** generated on the device, so retrying the same add can never create a duplicate */
  readonly id: string
  readonly userId: string
  readonly date: string
  readonly mealType: MealType
  readonly draft: MealItemDraft
}

type DishPortionJoin = {
  readonly dish_id: string
  readonly dishes: {
    readonly name: string | null
    readonly kcal_estimated: boolean
    readonly dish_portions: ReadonlyArray<{ readonly user_id: string | null }>
  } | null
}

function dishOf(portion: DishPortionJoin | null): DishRef | null {
  if (!portion) return null
  if (!portion.dishes) return { id: portion.dish_id, name: null }
  const portions = portion.dishes.dish_portions
  return {
    id: portion.dish_id,
    name: portion.dishes.name,
    portionCount: portions.length,
    eaterCount: portions.filter((other) => other.user_id !== null).length,
    kcalEstimated: portion.dishes.kcal_estimated,
  }
}

export async function fetchDay(userId: string, date: string): Promise<DayMeal[]> {
  const { data, error } = await supabase
    .from('meals')
    .select(
      'id, meal_type, meal_items(*, dish_portions(dish_id, dishes(name, kcal_estimated, dish_portions(user_id))))',
    )
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { referencedTable: 'meal_items' })
  if (error) throw ApiError.from(error)
  return data.map((meal) => ({
    ...meal,
    meal_items: meal.meal_items.map(({ dish_portions, ...item }) => ({
      ...item,
      dish: dishOf(dish_portions),
    })),
  }))
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
