import { ApiError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import type { MealItemDraft } from '../nutrition/fromIngredient'
import { noteOf, type AmountPatch, type DayMeal, type DishRef, type MealType } from './dayModel'

type AddMealItemInput = {
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
      'id, meal_type, cheat_meal, note, meal_items(*, dish_portions(dish_id, dishes(name, kcal_estimated, dish_portions(user_id))))',
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

type CheatMealInput = {
  readonly userId: string
  readonly date: string
  readonly mealType: MealType
  readonly cheatMeal: boolean
}

/** Marks a meal as a cheat meal (an empty one is created for it) or takes the mark back. */
export async function setCheatMeal({
  userId,
  date,
  mealType,
  cheatMeal,
}: CheatMealInput): Promise<void> {
  const { error } = await supabase.rpc('set_cheat_meal', {
    p_user_id: userId,
    p_date: date,
    p_meal_type: mealType,
    p_cheat_meal: cheatMeal,
  })
  if (error) throw ApiError.from(error)
}

type MealNoteInput = {
  readonly userId: string
  readonly date: string
  readonly mealType: MealType
  /** an empty one removes the note */
  readonly note: string
}

/** Sets a meal's note (an empty meal is created for it) or removes it. */
export async function setMealNote({ userId, date, mealType, note }: MealNoteInput): Promise<void> {
  const { error } = await supabase.rpc('set_meal_note', {
    p_user_id: userId,
    p_date: date,
    p_meal_type: mealType,
    p_note: note,
  })
  if (error) throw ApiError.from(error)
}

/** The day's note, or null. */
export async function fetchDayNote(userId: string, date: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('day_notes')
    .select('note')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()
  if (error) throw ApiError.from(error)
  return data?.note ?? null
}

/** Sets the day's note, or removes it when empty; both can be sent again safely. */
export async function setDayNote(userId: string, date: string, text: string): Promise<void> {
  const note = noteOf(text)
  const { error } = note
    ? await supabase
        .from('day_notes')
        .upsert({ user_id: userId, date, note }, { onConflict: 'user_id,date' })
    : await supabase.from('day_notes').delete().eq('user_id', userId).eq('date', date)
  if (error) throw ApiError.from(error)
}

/** How a whole day is marked; its calories can't be judged, so it is left out of every figure. */
export type DayMark = 'cheat' | 'alcohol' | null

/** Whether the day is a cheat day, an alcohol day or neither. */
export async function fetchDayMark(userId: string, date: string): Promise<DayMark> {
  const { data, error } = await supabase
    .from('cheat_days')
    .select('kind')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()
  if (error) throw ApiError.from(error)
  // the column is a plain string in the generated types; the database allows only these two
  return data?.kind === 'cheat' || data?.kind === 'alcohol' ? data.kind : null
}

/**
 * Marks the day as a cheat day or an alcohol day, replacing the other kind, or removes the mark;
 * both can be sent again safely.
 */
export async function setDayMark(userId: string, date: string, mark: DayMark): Promise<void> {
  const { error } = mark
    ? await supabase
        .from('cheat_days')
        .upsert({ user_id: userId, date, kind: mark }, { onConflict: 'user_id,date' })
    : await supabase.from('cheat_days').delete().eq('user_id', userId).eq('date', date)
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
