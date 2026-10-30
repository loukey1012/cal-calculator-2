/**
 * Which days count in averages (History, Trends) and which are flagged as missing a meal.
 * A day counts only when it's over, has food at lunch and at dinner, and isn't a cheat day, an
 * alcohol day (its calories are unknown) or a day with a cheat meal; breakfast and snacks may be
 * empty. Shared by the app and the Edge Functions: plain TypeScript without dependencies.
 */

/** Both of us log every day from here on (user, 2026-10-19); earlier days are never flagged. */
export const TRACKING_START = '2026-10-10'

type MainMeal = 'lunch' | 'dinner'

/** What the rules need of a day (from the daily_totals view). */
export type CountedDay = {
  readonly date: string
  readonly mealCount: number
  /** missing in data cached by older versions */
  readonly cheatDay?: boolean
  readonly cheatMeal?: boolean
  readonly alcoholDay?: boolean
  readonly lunchLogged?: boolean
  readonly dinnerLogged?: boolean
}

/** A day whose calories can't be judged, so it is left out of every figure. */
export function isLeftOut(day: Pick<CountedDay, 'cheatDay' | 'cheatMeal' | 'alcoholDay'>): boolean {
  return day.cheatDay === true || day.cheatMeal === true || day.alcoholDay === true
}

/** The main meals without food; a day with nothing logged has neither. */
export function missingMainMeals(day: CountedDay | undefined): MainMeal[] {
  if (!day) return ['lunch', 'dinner']
  // data cached before these were known reads as complete, rather than flagging every day
  const missing: MainMeal[] = []
  if (day.lunchLogged === false) missing.push('lunch')
  if (day.dinnerLogged === false) missing.push('dinner')
  return missing
}

/** Flagged in History: a past day since tracking started, not left out, without both meals. */
export function isMissingMeals(date: string, day: CountedDay | undefined, today: string): boolean {
  if (date < TRACKING_START || date >= today) return false
  if (day && isLeftOut(day)) return false
  return missingMainMeals(day).length > 0
}

export function countsInAverages(day: CountedDay, today: string): boolean {
  return (
    day.date < today && day.mealCount > 0 && !isLeftOut(day) && missingMainMeals(day).length === 0
  )
}
