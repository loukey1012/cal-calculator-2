import { useLocation } from 'react-router'
import { useCurrentUser } from '../../app/currentUser'
import { MEAL_TYPES, type MealType } from '../meals/dayModel'
import { foodPath, mealPath, type MealRef } from '../meals/mealPages'
import { useToday } from '../today/useToday'
import { hasContent, type AddFoodDraft } from './addFoodDraft'
import { useAddFoodSession } from './addFoodSessionContext'
import { useMealOfDay } from './useMealOfDay'

/**
 * Older versions had a Cook tab, and the notifications still link there (supabase/functions/
 * _shared/schedule.ts): /cook?person=u2&date=2026-10-04&meal=dinner opens that meal's Add food,
 * a bare /cook the meal a started dish is for.
 */
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const COOK_PATH = /^\/cook(\/|$)/
const HOME = '/today'

function isMealType(value: string | null): value is MealType {
  return MEAL_TYPES.some((meal) => meal.type === value)
}

/** null unless the link names a person, a day up to today and a meal. */
export function parseCookLink(params: URLSearchParams, today: string): MealRef | null {
  const userId = params.get('person')
  const date = params.get('date')
  const mealType = params.get('meal')
  if (!userId || !date || !DAY_PATTERN.test(date) || date > today) return null
  if (!isMealType(mealType)) return null
  return { userId, date, mealType }
}

/** Where an old Cook address leads now. */
export function legacyCookTarget(
  url: { readonly pathname: string; readonly search: string },
  draft: AddFoodDraft,
  { userId, today, mealOfDay }: { userId: string; today: string; mealOfDay: MealType },
): string | null {
  if (!COOK_PATH.test(url.pathname)) return null
  const meal =
    parseCookLink(new URLSearchParams(url.search), today) ??
    (hasContent(draft)
      ? { userId, date: draft.date ?? today, mealType: draft.mealType ?? mealOfDay }
      : null)
  if (!meal) return HOME
  return foodPath(mealPath(meal, meal.date === today ? 'today' : 'history'))
}

export function useLegacyCookTarget(): string | null {
  const { profile } = useCurrentUser()
  const location = useLocation()
  const { draft } = useAddFoodSession()
  const today = useToday()
  const mealOfDay = useMealOfDay()
  return legacyCookTarget(location, draft, { userId: profile.id, today, mealOfDay })
}
