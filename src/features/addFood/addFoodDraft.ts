import { newDish, withoutPortion, withPortion } from '../dishes/dishDraft'
import type { Dish, DishLine } from '../dishes/portions'
import type { MealType } from '../meals/dayModel'

/**
 * What Add food is putting together: a dish plus when it is eaten. Day and meal follow
 * today and the time of day until they are chosen, so a draft left overnight never lands on
 * yesterday. The eaters' own day and meal in `dish` only matter once resolved for saving.
 */
export type AddFoodDraft = {
  readonly dish: Dish
  /** local YYYY-MM-DD; null follows today */
  readonly date: string | null
  /** null follows the time of day */
  readonly mealType: MealType | null
}

/** Who to pre-select when Add food is opened from an empty meal. */
type AddFoodPrefill = {
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

export function newAddFoodDraft(userId: string): AddFoodDraft {
  return { dish: newDish([{ userId, ...UNRESOLVED }]), date: null, mealType: null }
}

export function draftEaterIds(draft: AddFoodDraft): string[] {
  return draft.dish.portions.flatMap((portion) => (portion.eater ? [portion.eater.userId] : []))
}

function portionOf(draft: AddFoodDraft, userId: string) {
  return draft.dish.portions.find((portion) => portion.eater?.userId === userId)
}

/** Ingredients only this person has; they go when the person stops eating. */
export function linesOnlyFor(draft: AddFoodDraft, userId: string): DishLine[] {
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
export function withEater(draft: AddFoodDraft, userId: string, eating: boolean): AddFoodDraft {
  const portion = portionOf(draft, userId)
  if (eating) {
    return portion ? draft : { ...draft, dish: withPortion(draft.dish, { userId, ...UNRESOLVED }) }
  }
  if (!portion || draftEaterIds(draft).length <= 1) return draft
  return { ...draft, dish: withoutPortion(draft.dish, portion.id) }
}

/** Choosing today again goes back to following today. */
export function withDate(draft: AddFoodDraft, date: string, today?: string): AddFoodDraft {
  return { ...draft, date: date === today ? null : date }
}

export function withMealType(draft: AddFoodDraft, mealType: MealType): AddFoodDraft {
  return { ...draft, mealType }
}

export function withDish(draft: AddFoodDraft, dish: Dish): AddFoodDraft {
  return { ...draft, dish }
}

export function hasContent(draft: AddFoodDraft): boolean {
  return (
    draft.dish.lines.length > 0 || (draft.dish.toWeigh?.length ?? 0) > 0 || draft.dish.name !== null
  )
}

/**
 * The dish as it is saved: everyone eating eats on the draft's day, in its meal (or the meal
 * for the time of day shown, `mealOfDay`).
 */
export function resolvedDish(draft: AddFoodDraft, today: string, mealOfDay: MealType): Dish {
  const date = draft.date ?? today
  const mealType = draft.mealType ?? mealOfDay
  return {
    ...draft.dish,
    portions: draft.dish.portions.map((portion) =>
      portion.eater ? { ...portion, eater: { ...portion.eater, date, mealType } } : portion,
    ),
  }
}

/**
 * A meal's Add food opened: a fresh draft becomes exactly that person, day and meal; a started
 * one keeps its people and ingredients and only adds the person. Opening it again for the same
 * meal changes nothing (so the waiting dish isn't noted as changed).
 */
export function withPrefill(
  draft: AddFoodDraft,
  prefill: AddFoodPrefill,
  today: string,
): AddFoodDraft {
  const onlyThem = draftEaterIds(draft).join() === prefill.userId
  const base = hasContent(draft) || onlyThem ? draft : newAddFoodDraft(prefill.userId)
  const withPerson = withEater(base, prefill.userId, true)
  const next = withMealType(withDate(withPerson, prefill.date, today), prefill.mealType)
  const same =
    next.dish === draft.dish && next.date === draft.date && next.mealType === draft.mealType
  return same ? draft : next
}

/** People who left the household stop eating; with nobody left, the cook eats. */
export function keepEaters(
  draft: AddFoodDraft,
  memberIds: readonly string[],
  cookId: string,
): AddFoodDraft {
  const strangers = draft.dish.portions.filter(
    (portion) => portion.eater && !memberIds.includes(portion.eater.userId),
  )
  if (strangers.length === 0) return draft
  const dish = strangers.reduce(
    (current, portion) => withoutPortion(current, portion.id),
    draft.dish,
  )
  const kept = { ...draft, dish }
  return draftEaterIds(kept).length > 0
    ? kept
    : { ...kept, dish: withPortion(dish, { userId: cookId, ...UNRESOLVED }) }
}
