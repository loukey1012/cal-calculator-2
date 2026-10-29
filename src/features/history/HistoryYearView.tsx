import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { toUserMessage } from '../../lib/errors'
import { useGoals } from '../goals/hooks'
import type { Profile } from '../household/householdApi'
import { dayStatus, type DayStatus } from './calendar'
import { CalendarKey } from './CalendarKey'
import { FilterPill } from './FilterPill'
import { useYearGymDates, useYearSexDates } from '../dayMarks/hooks'
import { useAllNotes, useYearTotals } from './hooks'
import { filterMatches, noteDatesOf, type MonthFilter } from './monthStats'
import { YearOverview } from './YearOverview'

type HistoryYearViewProps = {
  readonly person: Profile
  readonly year: number
  readonly today: string
  readonly selectedDay: string | null
  readonly filter: MonthFilter | null
  readonly onOpenMonth: (month: string) => void
  readonly onChangeYear: (year: number) => void
  readonly onChangeFilter: (filter: MonthFilter | null) => void
  readonly keyShown: boolean
}

/** The year overview with the filter, the key (when shown) and the error of the year's totals. */
export function HistoryYearView({
  person,
  year,
  today,
  selectedDay,
  filter,
  onOpenMonth,
  onChangeYear,
  onChangeFilter,
  keyShown,
}: HistoryYearViewProps) {
  const totals = useYearTotals(person.id, year)
  const goals = useGoals(person.id)
  const notes = useAllNotes(person.id)
  const gymDates = useYearGymDates(person.id, year)
  const sexDates = useYearSexDates(person.household_id, year)
  const byDate = new Map((totals.data ?? []).map((total) => [total.date, total]))
  const notedDays = noteDatesOf(notes.data ?? [])
  const gymDays = new Set(gymDates.data ?? [])
  const sexDays = new Set(sexDates.data ?? [])
  const loaded = totals.data !== undefined && goals.data !== undefined
  // neutral cells until there is something to judge: no total would read as a missing day
  const statusOf = (day: string): DayStatus =>
    loaded ? dayStatus(day, byDate.get(day), goals.data, today) : 'none'
  // nothing is faded while the data the filter needs is not there; the open day never is
  const dataReady: Record<MonthFilter, boolean> = {
    notes: notes.data !== undefined,
    alcohol: loaded,
    cheat: loaded,
    missing: loaded,
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

  return (
    <>
      <YearOverview
        year={year}
        today={today}
        statusOf={statusOf}
        fadedOf={fadedOf}
        loading={totals.isPending || goals.isPending}
        onOpenMonth={onOpenMonth}
        onChangeYear={onChangeYear}
      />
      {totals.isError && totals.data === undefined && (
        <ErrorBanner message={toUserMessage(totals.error)} />
      )}
      {goals.isError && goals.data === undefined && (
        <ErrorBanner message={toUserMessage(goals.error)} />
      )}
      {filter === 'notes' && notes.isError && notes.data === undefined && (
        <ErrorBanner message={toUserMessage(notes.error)} />
      )}
      <FilterPill filter={filter} onClear={() => onChangeFilter(null)} />
      {keyShown && <CalendarKey />}
    </>
  )
}
