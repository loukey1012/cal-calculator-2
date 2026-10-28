import type { MonthFilter } from './monthStats'

export type HistoryView = 'calendar' | 'notes' | 'trends'

/** What History showed, kept in the navigation state; `person` as for any page of the stack. */
export type HistoryState = {
  readonly person: string
  readonly month: string
  readonly filter: MonthFilter | null
  readonly view: HistoryView
  /** the search text of the Notes view */
  readonly notesQuery: string
  /** the opened day scrolls into view once (a note was tapped); later navigation carries false */
  readonly scrollToDay: boolean
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
