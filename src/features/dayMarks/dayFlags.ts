import { mealLabel, type MealType } from '../meals/dayModel'
import type { DayMark } from '../meals/mealsApi'

export type DayFlag = 'cheatDay' | 'alcohol' | 'gym' | 'sex'

export type FlagChange =
  | { readonly flag: DayFlag; readonly on: boolean }
  | { readonly flag: 'cheatMeal'; readonly meal: MealType; readonly on: boolean }

const MARK_OF_FLAG = { cheatDay: 'cheat', alcohol: 'alcohol' } as const

/** The day's mark after a tap: the active one turns off, the other one replaces it. */
export function nextDayMark(current: DayMark, tapped: 'cheatDay' | 'alcohol'): DayMark {
  const tappedMark = MARK_OF_FLAG[tapped]
  return current === tappedMark ? null : tappedMark
}

const FLAG_NAMES: Readonly<Record<DayFlag, string>> = {
  cheatDay: 'Cheat day',
  alcohol: 'Alcohol day',
  gym: 'Gym',
  sex: 'Sex',
}

/** The toast after a tap, e.g. "Gym set" or "Lunch marked as a cheat meal for baby". */
export function flagToastText(change: FlagChange, partnerName: string | null): string {
  const suffix = partnerName ? ` for ${partnerName}` : ''
  if (change.flag === 'cheatMeal') {
    const meal = mealLabel(change.meal)
    return change.on
      ? `${meal} marked as a cheat meal${suffix}`
      : `${meal} no longer a cheat meal${suffix}`
  }
  return `${FLAG_NAMES[change.flag]} ${change.on ? 'set' : 'removed'}${suffix}`
}
