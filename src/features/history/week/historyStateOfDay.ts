import { monthStart } from '../calendar'
import { notesQueryOf, yearOf, type HistoryState } from '../historyState'
import { monthFilterOf } from '../monthStats'

/** What History shows for a day opened from the week page: its month, the day open in the calendar. */
export function historyStateOfDay(day: string, personId: string, previous: unknown): HistoryState {
  return {
    person: personId,
    month: monthStart(day),
    filter: monthFilterOf(previous),
    view: 'calendar',
    calendarZoom: 'month',
    year: yearOf(previous) ?? Number(day.slice(0, 4)),
    notesQuery: notesQueryOf(previous),
    scrollToDay: true,
  }
}
