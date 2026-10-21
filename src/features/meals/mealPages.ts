import { MEAL_TYPES, type MealType } from './dayModel'

/**
 * The addresses of a meal and its pages. A meal is a page of the tab it was opened from:
 * /today/meal-lunch-2026-10-21-<person> or /history/2026-10-21/meal-lunch-2026-10-21-<person>.
 * Below it: Add food (/food, with the composer's steps below that) and Add from recipe
 * (/recipes, a recipe below that). Each page is one level below the one Back leads to.
 */
export type MealRef = {
  readonly userId: string
  /** local YYYY-MM-DD */
  readonly date: string
  readonly mealType: MealType
}

export type MealSubPage = 'meal' | 'food' | 'recipes'

export type MealPageRef = {
  readonly meal: MealRef
  /** the meal page's own address */
  readonly mealPath: string
  readonly page: MealSubPage
  /** what follows, e.g. ['add', '<id>'] below food or ['<recipe id>'] below recipes */
  readonly rest: readonly string[]
}

const FOOD_SEGMENT = 'food'
const RECIPES_SEGMENT = 'recipes'
const MEAL_SEGMENT = /^meal-([a-z]+)-(\d{4}-\d{2}-\d{2})-(.+)$/
const DAY = /^\d{4}-\d{2}-\d{2}$/

function isMealType(value: string): value is MealType {
  return MEAL_TYPES.some((meal) => meal.type === value)
}

export function mealSegment({ userId, date, mealType }: MealRef): string {
  return `meal-${mealType}-${date}-${encodeURIComponent(userId)}`
}

function mealOfSegment(segment: string): MealRef | null {
  const match = MEAL_SEGMENT.exec(segment)
  if (!match) return null
  const [, mealType = '', date = '', person = ''] = match
  if (!isMealType(mealType)) return null
  try {
    return { userId: decodeURIComponent(person), date, mealType }
  } catch {
    return null
  }
}

/** Where a meal opens: below the History day it was opened from, else below Today. */
export function mealPath(meal: MealRef, from: 'today' | 'history'): string {
  return from === 'history'
    ? `/history/${meal.date}/${mealSegment(meal)}`
    : `/today/${mealSegment(meal)}`
}

export function foodPath(mealPagePath: string): string {
  return `${mealPagePath}/${FOOD_SEGMENT}`
}

export function recipesPath(mealPagePath: string): string {
  return `${mealPagePath}/${RECIPES_SEGMENT}`
}

/** The meal page an address shows (or one of its pages), or null for Today or History itself. */
export function mealPageOf(path: string): MealPageRef | null {
  const segments = path.split('/').filter((segment) => segment !== '')
  const [tab, ...tail] = segments
  const prefix = tab === 'history' && tail[0] !== undefined && DAY.test(tail[0]) ? 2 : 1
  if (tab !== 'today' && prefix === 1) return null
  const meal = mealOfSegment(segments[prefix] ?? '')
  if (!meal) return null
  const mealPagePath = `/${segments.slice(0, prefix + 1).join('/')}`
  const [sub, ...rest] = segments.slice(prefix + 1)
  if (sub === undefined) return { meal, mealPath: mealPagePath, page: 'meal', rest: [] }
  if (sub === FOOD_SEGMENT) return { meal, mealPath: mealPagePath, page: 'food', rest }
  if (sub === RECIPES_SEGMENT) return { meal, mealPath: mealPagePath, page: 'recipes', rest }
  return { meal, mealPath: mealPagePath, page: 'meal', rest: [] }
}
