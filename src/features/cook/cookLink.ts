import { MEAL_TYPES, type MealType } from '../meals/dayModel'
import type { CookPrefill } from './cookDraft'

/** Where a Cook link may come from, so saving returns there (History with its open day). */
const ORIGIN_PATTERN = /^\/(today|history(\/\d{4}-\d{2}-\d{2})?)$/
const DEFAULT_ORIGIN = '/today'

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export type CookLink = { readonly prefill: CookPrefill; readonly returnTo: string }

/** e.g. /cook?person=u2&date=2026-10-04&meal=dinner&from=%2Fhistory */
export function cookLink(prefill: CookPrefill, from: string): string {
  const params = new URLSearchParams({
    person: prefill.userId,
    date: prefill.date,
    meal: prefill.mealType,
    from,
  })
  return `/cook?${params.toString()}`
}

function isMealType(value: string | null): value is MealType {
  return MEAL_TYPES.some((meal) => meal.type === value)
}

function isOrigin(value: string | null): value is string {
  return value !== null && ORIGIN_PATTERN.test(value)
}

/** null unless the link names a person, a day up to today and a meal. */
export function parseCookLink(params: URLSearchParams, today: string): CookLink | null {
  const userId = params.get('person')
  const date = params.get('date')
  const mealType = params.get('meal')
  const from = params.get('from')
  if (!userId || !date || !DAY_PATTERN.test(date) || date > today) return null
  if (!isMealType(mealType)) return null
  return { prefill: { userId, date, mealType }, returnTo: isOrigin(from) ? from : DEFAULT_ORIGIN }
}
