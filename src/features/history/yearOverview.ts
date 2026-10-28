import { fromLocalDateString, toLocalDateString } from '../../lib/dates'
import { monthRange } from './calendar'

const MONTHS_PER_YEAR = 12
const DAYS_PER_WEEK = 7

/** The earliest year the overview turns back to. */
export const FIRST_YEAR = 2000

const pad = (value: number) => String(value).padStart(2, '0')
const yearText = (year: number) => String(year).padStart(4, '0')

/** The first day (YYYY-MM-01) of each month of the year. */
export function monthsOfYear(year: number): string[] {
  return Array.from(
    { length: MONTHS_PER_YEAR },
    (_, index) => `${yearText(year)}-${pad(index + 1)}-01`,
  )
}

export function yearRange(year: number): { readonly first: string; readonly last: string } {
  return { first: `${yearText(year)}-01-01`, last: `${yearText(year)}-12-31` }
}

/** One small month of the overview: blanks up to the first weekday (Monday first), then its days. */
export function miniMonthOf(month: string): {
  readonly leadingBlanks: number
  readonly days: readonly string[]
} {
  const start = fromLocalDateString(month)
  const daysInMonth = Number(monthRange(month).last.slice(8))
  return {
    leadingBlanks: (start.getDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK,
    days: Array.from({ length: daysInMonth }, (_, index) =>
      toLocalDateString(new Date(start.getFullYear(), start.getMonth(), index + 1)),
    ),
  }
}
