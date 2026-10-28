import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { toUserMessage } from '../../lib/errors'
import { useGoals } from '../goals/hooks'
import type { Profile } from '../household/householdApi'
import { useWeights } from '../weight/hooks'
import { dayStatus, weekAverageKcal } from './calendar'
import { CalendarKey } from './CalendarKey'
import { CalendarOptionsMenu } from './CalendarOptionsMenu'
import { FilterMenu } from './FilterMenu'
import { FilterPill } from './FilterPill'
import { useMonthNotes, useMonthTotals, useWeekEdgeTotals } from './hooks'
import { MonthCalendar } from './MonthCalendar'
import { MonthQuickLook } from './MonthQuickLook'
import { MonthSummaryBlock } from './MonthSummaryBlock'
import { filterMatches, noteDatesOf, type MonthFilter } from './monthStats'
import { useKeyShown } from './useKeyShown'

type HistoryCalendarViewProps = {
  readonly person: Profile
  readonly month: string
  readonly today: string
  readonly selectedDay: string | null
  readonly filter: MonthFilter | null
  readonly onChangeMonth: (month: string) => void
  readonly onChangeFilter: (filter: MonthFilter | null) => void
  readonly onSelectDay: (day: string) => void
}

/** The calendar with its filter and options, the key (when shown) and the month's summary. */
export function HistoryCalendarView({
  person,
  month,
  today,
  selectedDay,
  filter,
  onChangeMonth,
  onChangeFilter,
  onSelectDay,
}: HistoryCalendarViewProps) {
  const totals = useMonthTotals(person.id, month)
  const goals = useGoals(person.id)
  const edgeTotals = useWeekEdgeTotals(person.id, month, today)
  const notes = useMonthNotes(person.id, month)
  const weights = useWeights(person.id)
  const [keyShown, setKeyShown] = useKeyShown()
  const byDate = new Map((totals.data ?? []).map((total) => [total.date, total]))
  // a week across two months averages all its days: the edge days only count there
  const byDateInWeeks = new Map(
    [...(edgeTotals.data ?? []), ...(totals.data ?? [])].map((total) => [total.date, total]),
  )
  const notedDays = noteDatesOf(notes.data ?? [])
  const statusOf = (day: string) => dayStatus(day, byDate.get(day), goals.data ?? [], today)
  const weighedDays = new Set((weights.data ?? []).map((entry) => entry.date))
  // nothing is faded while the data the filter needs is not there; the open day never is
  const filterReady =
    filter === 'notes' ? notes.data !== undefined : filter !== null && totals.data !== undefined
  const fadedOf =
    filter !== null && filterReady
      ? (day: string) =>
          day !== selectedDay &&
          !filterMatches(filter, statusOf(day), notedDays.has(day), byDate.get(day))
      : undefined

  return (
    <>
      <MonthCalendar
        month={month}
        today={today}
        selectedDay={selectedDay}
        statusOf={statusOf}
        marksOf={(day) => ({
          hasNote: notedDays.has(day),
          weighed: weighedDays.has(day),
          estimated: byDate.get(day)?.kcalEstimated === true,
        })}
        fadedOf={fadedOf}
        averageOf={(week) => weekAverageKcal(week, byDateInWeeks, today)}
        onSelectDay={onSelectDay}
        onChangeMonth={onChangeMonth}
        headerActions={
          <>
            <FilterMenu filter={filter} onChange={onChangeFilter} />
            <CalendarOptionsMenu keyShown={keyShown} onChangeKeyShown={setKeyShown} />
          </>
        }
        renderQuickLook={(day, close) => (
          <MonthQuickLook
            userId={person.id}
            date={day}
            today={today}
            total={byDate.get(day)}
            goals={goals.data}
            hasNote={notedDays.has(day)}
            onClose={close}
          />
        )}
      />
      {notes.isError && notes.data === undefined && (
        <ErrorBanner message={toUserMessage(notes.error)} />
      )}
      <FilterPill filter={filter} onClear={() => onChangeFilter(null)} />
      {keyShown && <CalendarKey />}
      <MonthSummaryBlock
        totals={totals}
        goals={goals.data}
        weights={weights.data}
        month={month}
        today={today}
      />
    </>
  )
}
