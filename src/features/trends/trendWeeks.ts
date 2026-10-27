import { fromLocalDateString } from '../../lib/dates'
import { countsInAverages, isLeftOut } from '../../../supabase/functions/_shared/dayCounting'
import { addDays, mondayOf, type NutritionDay } from './trends'

/** A calendar week (Monday to Sunday) the Week view can show. */
export type LoggedWeek = {
  readonly monday: string
  /** Ø kcal of its counted days (see dayCounting), or null when none counts */
  readonly average: number | null
}

const DAYS_PER_WEEK = 7
const MS_PER_DAY = 86_400_000
const THURSDAY_OFFSET = 3

const hasEntry = (day: NutritionDay) => day.mealCount > 0 || isLeftOut(day)

/** Every week with at least one entry, newest first; the current week is always there. */
export function loggedWeeks(days: readonly NutritionDay[], today: string): LoggedWeek[] {
  const current = mondayOf(today)
  const byWeek = new Map<string, NutritionDay[]>([[current, []]])
  for (const day of days.filter(hasEntry)) {
    const monday = mondayOf(day.date)
    if (monday <= current) byWeek.set(monday, [...(byWeek.get(monday) ?? []), day])
  }
  return [...byWeek]
    .toSorted(([a], [b]) => b.localeCompare(a))
    .map(([monday, week]) => {
      const counted = week.filter((day) => countsInAverages(day, today))
      const total = counted.reduce((sum, day) => sum + day.kcal, 0)
      return { monday, average: counted.length === 0 ? null : total / counted.length }
    })
}

function neighbour(weeks: readonly LoggedWeek[], monday: string, step: 1 | -1): string | null {
  const index = weeks.findIndex((week) => week.monday === monday)
  if (index === -1) return null
  return weeks[index + step]?.monday ?? null
}

/** The next older week with an entry (weeks are newest first), or null at the oldest. */
export function olderWeek(weeks: readonly LoggedWeek[], monday: string): string | null {
  return neighbour(weeks, monday, 1)
}

/** The next newer week with an entry, or null at the current week. */
export function newerWeek(weeks: readonly LoggedWeek[], monday: string): string | null {
  return neighbour(weeks, monday, -1)
}

/** The ISO week number: weeks start on Monday, week 1 holds the year's first Thursday. */
export function weekNumber(date: string): number {
  const thursday = fromLocalDateString(addDays(mondayOf(date), THURSDAY_OFFSET))
  const firstOfYear = new Date(thursday.getFullYear(), 0, 1)
  const dayOfYear = Math.round((thursday.getTime() - firstOfYear.getTime()) / MS_PER_DAY)
  return Math.floor(dayOfYear / DAYS_PER_WEEK) + 1
}
