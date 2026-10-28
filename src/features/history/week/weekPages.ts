import {
  addDays,
  isoWeekOf,
  weekDatesOf,
  weekPath,
  weeksInYear,
  type IsoWeek,
} from '../../../../supabase/functions/_shared/isoWeek'

/**
 * The week page's address. The ISO 8601 week maths behind it (weeks start on Monday, week 1 holds
 * the year's first Thursday) lives in supabase/functions/_shared/isoWeek.ts, shared with the
 * weekly notification.
 */
const WEEK_PAGE = /^\/history\/week-(\d{4})-(\d{2})\/?$/
const DAYS_PER_WEEK = 7

export { isoWeekOf, weekDatesOf, weekPath, weeksInYear, type IsoWeek }

export function shiftWeek(week: IsoWeek, count: number): IsoWeek {
  return isoWeekOf(addDays(weekDatesOf(week)[0] ?? '', count * DAYS_PER_WEEK))
}

/** Whether the address is a week page's (whatever week it names). */
export function isWeekPath(path: string): boolean {
  return WEEK_PAGE.test(path)
}

const FIRST_YEAR = 2000

/**
 * The week an address shows, or null for anything else: a week the year doesn't have, a year
 * before 2000 or after next year (counted from `today`).
 */
export function weekPageOf(path: string, today: string): IsoWeek | null {
  const match = WEEK_PAGE.exec(path)
  if (!match) return null
  const year = Number(match[1])
  if (year < FIRST_YEAR || year > Number(today.slice(0, 4)) + 1) return null
  const week = Number(match[2])
  return week >= 1 && week <= weeksInYear(year) ? { year, week } : null
}
