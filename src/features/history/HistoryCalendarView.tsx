import { useIsPageShown } from '../../app/pagePath'
import { useCurrentUser } from '../../app/currentUser'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { toUserMessage } from '../../lib/errors'
import { useGoals } from '../goals/hooks'
import type { Profile } from '../household/householdApi'
import { useLookOf } from '../household/usePersonLook'
import type { CalendarZoom } from './historyState'
import { useMonthGymDates, useMonthSexDates } from '../dayMarks/hooks'
import { useWeights } from '../weight/hooks'
import { dayStatus, monthWeeks, weekAverageKcal } from './calendar'
import { CalendarKey } from './CalendarKey'
import { FilterPill } from './FilterPill'
import { savedKcal } from './week/weekStats'
import { useMonthNotes, useMonthTotals, useWeekEdgeTotals } from './hooks'
import { MonthCalendar } from './MonthCalendar'
import { WeekBar } from './WeekBar'
import { MonthQuickLook } from './MonthQuickLook'
import { HistoryYearView } from './HistoryYearView'
import { filterMatches, noteDatesOf, type MonthFilter } from './monthStats'

// "2026-10" of "2026-10-01"
const MONTH_PREFIX_LENGTH = 7

type HistoryCalendarViewProps = {
  readonly person: Profile
  readonly month: string
  readonly zoom: CalendarZoom
  readonly year: number
  readonly today: string
  readonly selectedDay: string | null
  readonly filter: MonthFilter | null
  readonly onChangeMonth: (month: string) => void
  readonly onShowYear: () => void
  readonly onOpenMonth: (month: string) => void
  readonly onChangeYear: (year: number) => void
  readonly onChangeFilter: (filter: MonthFilter | null) => void
  readonly onSelectDay: (day: string) => void
  /** the week bar was tapped; gets the week's dates, Monday first */
  readonly onOpenWeek: (week: ReadonlyArray<string>) => void
  readonly keyShown: boolean
}

/** The month, or the year in small, with its filter and options and the key (when shown). */
export function HistoryCalendarView({
  zoom,
  year,
  onOpenMonth,
  onChangeYear,
  ...props
}: HistoryCalendarViewProps) {
  if (zoom === 'year') {
    return (
      <HistoryYearView
        person={props.person}
        year={year}
        today={props.today}
        selectedDay={props.selectedDay}
        filter={props.filter}
        onOpenMonth={onOpenMonth}
        onChangeYear={onChangeYear}
        onChangeFilter={props.onChangeFilter}
        keyShown={props.keyShown}
      />
    )
  }
  return <HistoryMonthView {...props} />
}

type HistoryMonthViewProps = Omit<
  HistoryCalendarViewProps,
  'zoom' | 'year' | 'onOpenMonth' | 'onChangeYear'
>

/** The month calendar with its filter and options, the key (when shown) and the error of the month's totals. */
function HistoryMonthView({
  person,
  month,
  today,
  selectedDay,
  filter,
  onChangeMonth,
  onShowYear,
  onChangeFilter,
  onSelectDay,
  onOpenWeek,
  keyShown,
}: HistoryMonthViewProps) {
  const { profile } = useCurrentUser()
  const pageShown = useIsPageShown()
  const lookOf = useLookOf()
  const isOwnCalendar = person.id === profile.id
  const totals = useMonthTotals(person.id, month)
  const goals = useGoals(person.id)
  const edgeTotals = useWeekEdgeTotals(person.id, month, today)
  const notes = useMonthNotes(person.id, month)
  const weights = useWeights(person.id)
  const gymDates = useMonthGymDates(person.id, month)
  const sexDates = useMonthSexDates(person.household_id, month)
  const byDate = new Map((totals.data ?? []).map((total) => [total.date, total]))
  // a week across two months averages all its days: the edge days only count there
  const byDateInWeeks = new Map(
    [...(edgeTotals.data ?? []), ...(totals.data ?? [])].map((total) => [total.date, total]),
  )
  // a row's figures need every day of it: its other month's days too,
  const monthPrefix = month.slice(0, MONTH_PREFIX_LENGTH)
  const rowReady = (week: ReadonlyArray<string>) =>
    totals.data !== undefined &&
    (edgeTotals.data !== undefined || week.every((day) => day.startsWith(monthPrefix)))
  const notedDays = noteDatesOf(notes.data ?? [])
  const statusOf = (day: string) => dayStatus(day, byDate.get(day), goals.data ?? [], today)
  const weighedDays = new Set((weights.data ?? []).map((entry) => entry.date))
  const gymDays = new Set(gymDates.data ?? [])
  const sexDays = new Set(sexDates.data ?? [])
  // nothing is faded while the data the filter needs is not there; the open day never is
  const totalsReady = totals.data !== undefined
  const dataReady: Record<MonthFilter, boolean> = {
    notes: notes.data !== undefined,
    alcohol: totalsReady,
    cheat: totalsReady,
    missing: totalsReady,
    gym: gymDates.data !== undefined,
    sex: sexDates.data !== undefined,
  }
  const filterReady = filter !== null && dataReady[filter]
  const fadedOf =
    filter !== null && filterReady
      ? (day: string) =>
          day !== selectedDay &&
          !filterMatches({
            filter,
            status: statusOf(day),
            hasNote: notedDays.has(day),
            total: byDate.get(day),
            hasGym: gymDays.has(day),
            hasSex: sexDays.has(day),
          })
      : undefined

  // the bar belongs to the open day's week when that day is in the shown month (a day of a
  // neighbouring month is no cell here), else to the running week when the month shows it
  const barDay =
    selectedDay !== null && selectedDay.startsWith(monthPrefix)
      ? selectedDay
      : today.startsWith(monthPrefix)
        ? today
        : null
  const barWeek = monthWeeks(month).find((week) => barDay !== null && week.includes(barDay)) ?? null
  const weekBar =
    barWeek === null ? null : (
      <WeekBar
        week={barWeek}
        figures={
          rowReady(barWeek)
            ? {
                average: weekAverageKcal(barWeek, byDateInWeeks, today),
                saved:
                  savedKcal(
                    barWeek.flatMap((day) => byDateInWeeks.get(day) ?? []),
                    person.kcal_burned,
                    today,
                  )?.saved ?? null,
              }
            : null
        }
        onOpen={onOpenWeek}
      />
    )

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
          gym: gymDays.has(day),
          sex: sexDays.has(day),
        })}
        fadedOf={fadedOf}
        footer={weekBar}
        quickLookScope={person.id}
        pageShown={pageShown}
        onSelectDay={onSelectDay}
        onChangeMonth={onChangeMonth}
        onShowYear={onShowYear}
        renderQuickLook={(day, close, pinned) => (
          <MonthQuickLook
            userId={person.id}
            date={day}
            today={today}
            total={byDate.get(day)}
            goals={goals.data}
            hasNote={notedDays.has(day)}
            householdId={person.household_id}
            partnerName={isOwnCalendar ? null : lookOf(person).name}
            pinned={pinned}
            onClose={close}
          />
        )}
      />
      {notes.isError && notes.data === undefined && (
        <ErrorBanner message={toUserMessage(notes.error)} />
      )}
      <FilterPill filter={filter} onClear={() => onChangeFilter(null)} />
      {keyShown && <CalendarKey />}
      {totals.isError && totals.data === undefined && (
        <ErrorBanner message={toUserMessage(totals.error)} />
      )}
    </>
  )
}
