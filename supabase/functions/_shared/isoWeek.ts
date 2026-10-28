/**
 * ISO 8601 weeks on plain YYYY-MM-DD dates (no time zones involved): weeks start on Monday, week 1
 * is the one holding the year's first Thursday, so the week-numbering year can differ from the
 * calendar year (2027-01-01 is in week 53 of 2026). Shared by the app (week page) and push-tick
 * (weekly notification): plain TypeScript without dependencies.
 */
export type IsoWeek = { readonly year: number; readonly week: number }

const DAYS_PER_WEEK = 7
const MS_PER_DAY = 86_400_000
const JANUARY_FOURTH = 4
const THURSDAY = 4

function utcOf(date: string): Date {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function addDays(date: string, days: number): string {
  const moved = utcOf(date)
  moved.setUTCDate(moved.getUTCDate() + days)
  return moved.toISOString().slice(0, 10)
}

/** 1 for Monday … 7 for Sunday. */
export function isoWeekday(date: string): number {
  return utcOf(date).getUTCDay() || DAYS_PER_WEEK
}

/** The Monday of week 1 of the week-numbering year. */
function firstMonday(year: number): string {
  const january4 = `${year}-01-0${JANUARY_FOURTH}`
  return addDays(january4, 1 - isoWeekday(january4))
}

export function isoWeekOf(date: string): IsoWeek {
  // the week belongs to the year of its Thursday
  const thursday = addDays(date, THURSDAY - isoWeekday(date))
  const year = Number(thursday.slice(0, 4))
  const days = Math.round(
    (utcOf(thursday).getTime() - utcOf(firstMonday(year)).getTime()) / MS_PER_DAY,
  )
  return { year, week: Math.floor(days / DAYS_PER_WEEK) + 1 }
}

export function weeksInYear(year: number): number {
  return isoWeekOf(addDays(firstMonday(year + 1), -1)).week
}

/** The seven dates of the week, Monday first. */
export function weekDatesOf({ year, week }: IsoWeek): string[] {
  const monday = addDays(firstMonday(year), (week - 1) * DAYS_PER_WEEK)
  return Array.from({ length: DAYS_PER_WEEK }, (_, index) => addDays(monday, index))
}

/** The week before the one holding `date`. */
export function previousIsoWeek(date: string): IsoWeek {
  return isoWeekOf(addDays(date, -DAYS_PER_WEEK))
}

/** e.g. /history/week-2026-44 */
export function weekPath({ year, week }: IsoWeek): string {
  return `/history/week-${year}-${String(week).padStart(2, '0')}`
}
