/**
 * Which days count in averages (History, Trends) and which are flagged as missing a meal.
 * A day counts only when it's over, has food at lunch and at dinner, and isn't a cheat day or
 * a day with a cheat meal; breakfast and snacks may be empty.
 */

/** Both of us log every day from here on (user, 2026-10-19); earlier days are never flagged. */
export const TRACKING_START = '2026-10-10'

export type MainMeal = 'lunch' | 'dinner'

/** What the rules need of a day (from the daily_totals view). */
export type CountedDay = {
  readonly date: string
  readonly mealCount: number
  /** missing in data cached by older versions */
  readonly cheatDay?: boolean
  readonly cheatMeal?: boolean
  readonly lunchLogged?: boolean
  readonly dinnerLogged?: boolean
}

export function isCheat(day: Pick<CountedDay, 'cheatDay' | 'cheatMeal'>): boolean {
  return day.cheatDay === true || day.cheatMeal === true
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

/** Flagged in History: a past day since tracking started, not a cheat day, without both meals. */
export function isMissingMeals(date: string, day: CountedDay | undefined, today: string): boolean {
  if (date < TRACKING_START || date >= today) return false
  if (day && isCheat(day)) return false
  return missingMainMeals(day).length > 0
}

export function countsInAverages(day: CountedDay, today: string): boolean {
  return (
    day.date < today && day.mealCount > 0 && !isCheat(day) && missingMainMeals(day).length === 0
  )
}
