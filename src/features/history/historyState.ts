import type { MonthFilter } from './monthStats'
import { FIRST_YEAR } from './yearOverview'

export type HistoryView = 'calendar' | 'notes' | 'trends'

/** The calendar shows one month, or the twelve months of a year in small. */
export type CalendarZoom = 'month' | 'year'

/** What History showed, kept in the navigation state; `person` as for any page of the stack. */
export type HistoryState = {
  readonly person: string
  readonly month: string
  readonly filter: MonthFilter | null
  readonly view: HistoryView
  readonly calendarZoom: CalendarZoom
  /** the year the overview shows (also kept while the month is shown) */
  readonly year: number
  /** the search text of the Notes view */
  readonly notesQuery: string
  /** the opened day scrolls into view once (a note was tapped); later navigation carries false */
  readonly scrollToDay: boolean
  /** set when a week page is opened: the History address it was opened from, where Back leads */
  readonly weekOrigin?: string
}

const MONTH_START = /^\d{4}-(0[1-9]|1[0-2])-01$/

export function monthOf(state: unknown): string | null {
  if (typeof state !== 'object' || state === null || !('month' in state)) return null
  return typeof state.month === 'string' && MONTH_START.test(state.month) ? state.month : null
}

/** The search text of the Notes view kept in the navigation state; none reads as empty. */
export function notesQueryOf(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('notesQuery' in state)) return ''
  return typeof state.notesQuery === 'string' ? state.notesQuery : ''
}

/** Whether the navigation asks the opened day to scroll into view. */
export function scrollToDayOf(state: unknown): boolean {
  if (typeof state !== 'object' || state === null || !('scrollToDay' in state)) return false
  return state.scrollToDay === true
}

/** The view kept in the navigation state; anything else (or nothing) reads as the calendar. */
export function viewOf(state: unknown): HistoryView {
  if (typeof state !== 'object' || state === null || !('view' in state)) return 'calendar'
  return state.view === 'notes' || state.view === 'trends' ? state.view : 'calendar'
}

/** The calendar zoom kept in the navigation state; anything else (or nothing) reads as the month. */
export function calendarZoomOf(state: unknown): CalendarZoom {
  if (typeof state !== 'object' || state === null || !('calendarZoom' in state)) return 'month'
  return state.calendarZoom === 'year' ? 'year' : 'month'
}

const LAST_YEAR = 2999

/** The year of the overview kept in the navigation state; null when it is missing or not a year. */
export function yearOf(state: unknown): number | null {
  if (typeof state !== 'object' || state === null || !('year' in state)) return null
  const { year } = state
  return typeof year === 'number' &&
    Number.isInteger(year) &&
    year >= FIRST_YEAR &&
    year <= LAST_YEAR
    ? year
    : null
}

const HISTORY_ADDRESS = /^\/history(\/\d{4}-\d{2}-\d{2})?$/

/** The History address a week page was opened from; none (or anything else) reads as null. */
export function weekOriginOf(state: unknown): string | null {
  if (typeof state !== 'object' || state === null || !('weekOrigin' in state)) return null
  const { weekOrigin } = state
  return typeof weekOrigin === 'string' && HISTORY_ADDRESS.test(weekOrigin) ? weekOrigin : null
}
