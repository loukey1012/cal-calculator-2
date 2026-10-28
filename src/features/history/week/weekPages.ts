import { fromLocalDateString, toLocalDateString } from '../../../lib/dates'

/**
 * The week page's address and the ISO 8601 week maths behind it: weeks start on Monday, week 1
 * is the one holding the year's first Thursday, so the week-numbering year can differ from the
 * calendar year (2027-01-01 is in week 53 of 2026).
 */
export type IsoWeek = { readonly year: number; readonly week: number }

const DAYS_PER_WEEK = 7
const MS_PER_DAY = 86_400_000
const JANUARY_FOURTH = 4
const THURSDAY_OFFSET = 3
const WEEK_PAGE = /^\/history\/week-(\d{4})-(\d{2})\/?$/

/** 0 for Monday … 6 for Sunday. */
function mondayBasedDay(date: Date): number {
  return (date.getDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK
}

function dayOffset(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count)
}

/** The Monday of week 1 of the week-numbering year. */
function firstMonday(year: number): Date {
  const january4 = new Date(year, 0, JANUARY_FOURTH)
  return dayOffset(january4, -mondayBasedDay(january4))
}

export function isoWeekOf(date: string): IsoWeek {
  const day = fromLocalDateString(date)
  // the week belongs to the year of its Thursday
  const thursday = dayOffset(day, THURSDAY_OFFSET - mondayBasedDay(day))
  const year = thursday.getFullYear()
  const days = Math.round((thursday.getTime() - firstMonday(year).getTime()) / MS_PER_DAY)
  return { year, week: Math.floor(days / DAYS_PER_WEEK) + 1 }
}

export function weeksInYear(year: number): number {
  return isoWeekOf(toLocalDateString(dayOffset(firstMonday(year + 1), -1))).week
}

/** The seven dates of the week, Monday first. */
export function weekDatesOf({ year, week }: IsoWeek): string[] {
  const monday = dayOffset(firstMonday(year), (week - 1) * DAYS_PER_WEEK)
  return Array.from({ length: DAYS_PER_WEEK }, (_, index) =>
    toLocalDateString(dayOffset(monday, index)),
  )
}

export function shiftWeek(week: IsoWeek, count: number): IsoWeek {
  const monday = fromLocalDateString(weekDatesOf(week)[0] ?? '')
  return isoWeekOf(toLocalDateString(dayOffset(monday, count * DAYS_PER_WEEK)))
}

/** e.g. /history/week-2026-44 */
export function weekPath({ year, week }: IsoWeek): string {
  return `/history/week-${year}-${String(week).padStart(2, '0')}`
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
