import { newDish, withoutPortion, withPortion } from '../dishes/dishDraft'
import type { Dish, DishLine } from '../dishes/portions'
import type { MealType } from '../meals/dayModel'

/**
 * What the Cook tab is putting together: a dish plus when it is eaten. Day and meal follow
 * today and the time of day until they are chosen, so a draft left overnight never lands on
 * yesterday. The eaters' own day and meal in `dish` only matter once resolved for saving.
 */
export type CookDraft = {
  readonly dish: Dish
  /** local YYYY-MM-DD; null follows today */
  readonly date: string | null
  /** null follows the time of day */
  readonly mealType: MealType | null
}

/** Who to pre-select when the Cook tab is opened from an empty meal. */
export type CookPrefill = {
  readonly userId: string
  readonly date: string
  readonly mealType: MealType
}

// meal by local hour: [from hour, meal]; before the first entry it is a late snack
const MEAL_HOURS: ReadonlyArray<readonly [number, MealType]> = [
  [5, 'breakfast'],
  [11, 'lunch'],
  [15, 'snack'],
  [17, 'dinner'],
  [22, 'snack'],
]

export function mealForTime(now: Date): MealType {
  const hour = now.getHours()
  return MEAL_HOURS.findLast(([from]) => hour >= from)?.[1] ?? 'snack'
}

// replaced by resolvedDish before anything is saved
const UNRESOLVED = { date: '', mealType: 'snack' } as const

export function newCookDraft(userId: string): CookDraft {
  return { dish: newDish([{ userId, ...UNRESOLVED }]), date: null, mealType: null }
}

export function draftEaterIds(draft: CookDraft): string[] {
  return draft.dish.portions.flatMap((portion) => (portion.eater ? [portion.eater.userId] : []))
}

function portionOf(draft: CookDraft, userId: string) {
  return draft.dish.portions.find((portion) => portion.eater?.userId === userId)
}

/** Ingredients only this person has; they go when the person stops eating. */
export function linesOnlyFor(draft: CookDraft, userId: string): DishLine[] {
  const portion = portionOf(draft, userId)
  if (!portion) return []
  return draft.dish.lines.filter((line) => {
    const portionIds = Object.keys(line.amounts)
    return (
      line.allocation === 'per_portion' && portionIds.length === 1 && portionIds[0] === portion.id
    )
  })
}

/** Someone starts or stops eating; the last person eating stays. */
export function withEater(draft: CookDraft, userId: string, eating: boolean): CookDraft {
  const portion = portionOf(draft, userId)
  if (eating) {
    return portion ? draft : { ...draft, dish: withPortion(draft.dish, { userId, ...UNRESOLVED }) }
  }
  if (!portion || draftEaterIds(draft).length <= 1) return draft
  return { ...draft, dish: withoutPortion(draft.dish, portion.id) }
}

/** Choosing today again goes back to following today. */
export function withDate(draft: CookDraft, date: string, today?: string): CookDraft {
  return { ...draft, date: date === today ? null : date }
}

export function withMealType(draft: CookDraft, mealType: MealType): CookDraft {
  return { ...draft, mealType }
}

export function withDish(draft: CookDraft, dish: Dish): CookDraft {
  return { ...draft, dish }
}

export function hasContent(draft: CookDraft): boolean {
  return draft.dish.lines.length > 0 || draft.dish.name !== null
}

/** The dish as it is saved: everyone eating eats on the draft's day, in its meal. */
export function resolvedDish(draft: CookDraft, today: string, now: Date): Dish {
  const date = draft.date ?? today
  const mealType = draft.mealType ?? mealForTime(now)
  return {
    ...draft.dish,
    portions: draft.dish.portions.map((portion) =>
      portion.eater ? { ...portion, eater: { ...portion.eater, date, mealType } } : portion,
    ),
  }
}

/**
 * Opened from an empty meal: a fresh draft becomes exactly that person, day and meal; a started
 * one keeps its people and ingredients and only adds the person.
 */
export function withPrefill(draft: CookDraft, prefill: CookPrefill, today: string): CookDraft {
  const base = hasContent(draft) ? draft : newCookDraft(prefill.userId)
  const withPerson = withEater(base, prefill.userId, true)
  return withMealType(withDate(withPerson, prefill.date, today), prefill.mealType)
}
