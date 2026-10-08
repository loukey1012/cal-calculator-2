import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useCurrentUser } from '../../app/currentUser'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { PageHeader } from '../../components/ios/PageHeader'
import { fromLocalDateString, toLocalDateString } from '../../lib/dates'
import { toUserMessage } from '../../lib/errors'
import { useGoals } from '../goals/hooks'
import { usePeople } from '../household/hooks'
import type { Profile } from '../household/householdApi'
import { PersonSwitch } from '../household/PersonSwitch'
import { formatGrams, formatKcalTotal } from '../nutrition/format'
import { DayView } from '../today/DayView'
import { useToday } from '../today/useToday'
import { dayStatus, monthStart, monthSummary, type MonthSummary } from './calendar'
import { useMonthTotals } from './hooks'
import { MonthCalendar } from './MonthCalendar'

const DAY_ROUTE = /^\/history\/(\d{4}-\d{2}-\d{2})$/
const DAY_TITLE: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }

function isRealDay(day: string): boolean {
  return toLocalDateString(fromLocalDateString(day)) === day
}

function summaryText({ loggedDays, averageKcal, averageProtein, estimated }: MonthSummary): string {
  if (loggedDays === 0) return 'Nothing logged this month.'
  const days = loggedDays === 1 ? '1 day logged' : `${loggedDays} days logged`
  const kcal = `${days} · Ø ${formatKcalTotal({ kcal: averageKcal, estimated })} kcal`
  // no protein data at all would read as a misleading "0.0 g"
  return averageProtein > 0 ? `${kcal} · Ø ${formatGrams(averageProtein)} g protein` : kcal
}

/** Month calendar; the selected day (kept in the URL) opens beneath it, fully editable. */
export function HistoryPage() {
  const { profile, householdId } = useCurrentUser()
  const today = useToday()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const people = usePeople(profile, householdId)
  const [selectedId, setSelectedId] = useState(profile.id)
  const person = people.find((member) => member.id === selectedId) ?? profile

  const requestedDay = DAY_ROUTE.exec(pathname)?.[1]
  // only real days up to today can be opened; anything else shows just the calendar
  const selectedDay =
    requestedDay !== undefined && isRealDay(requestedDay) && requestedDay <= today
      ? requestedDay
      : null
  const [month, setMonth] = useState(() => monthStart(selectedDay ?? today))

  // selecting replaces the entry: browsing days builds no back stack
  function toggleDay(day: string) {
    navigate(day === selectedDay ? '/history' : `/history/${day}`, { replace: true })
  }

  return (
    <>
      <PageHeader title="History" />
      <PersonSwitch people={people} selectedId={person.id} onChange={setSelectedId} />
      <MonthOverview
        key={person.id}
        person={person}
        month={month}
        today={today}
        selectedDay={selectedDay}
        onChangeMonth={setMonth}
        onSelectDay={toggleDay}
      />
      {selectedDay ? (
        <SelectedDay day={selectedDay} person={person} isOwnDay={person.id === profile.id} />
      ) : (
        <p className="mt-6 text-center text-[15px] text-label-secondary">
          Tap a day to see what was eaten.
        </p>
      )}
    </>
  )
}

type SelectedDayProps = {
  readonly day: string
  readonly person: Profile
  readonly isOwnDay: boolean
}

function SelectedDay({ day, person, isOwnDay }: SelectedDayProps) {
  const title = new Intl.DateTimeFormat(undefined, DAY_TITLE).format(fromLocalDateString(day))
  return (
    <section aria-labelledby="history-day-title" className="mt-6">
      <h2 id="history-day-title" className="px-1 font-display text-[22px] font-bold">
        {title}
      </h2>
      <DayView key={person.id} person={person} isOwnDay={isOwnDay} date={day} />
    </section>
  )
}

type MonthOverviewProps = {
  readonly person: Profile
  readonly month: string
  readonly today: string
  readonly selectedDay: string | null
  readonly onChangeMonth: (month: string) => void
  readonly onSelectDay: (day: string) => void
}

function MonthOverview({
  person,
  month,
  today,
  selectedDay,
  onChangeMonth,
  onSelectDay,
}: MonthOverviewProps) {
  const totals = useMonthTotals(person.id, month)
  const goals = useGoals(person.id)
  const byDate = new Map((totals.data ?? []).map((total) => [total.date, total]))

  return (
    <>
      <MonthCalendar
        month={month}
        today={today}
        selectedDay={selectedDay}
        statusOf={(day) => dayStatus(byDate.get(day), goals.data ?? [])}
        onSelectDay={onSelectDay}
        onChangeMonth={onChangeMonth}
      />
      {totals.isError && totals.data === undefined ? (
        <ErrorBanner message={toUserMessage(totals.error)} />
      ) : (
        <p
          data-testid="month-summary"
          className="mt-3 px-1 text-[14px] font-medium text-label-secondary"
        >
          {totals.isPending ? 'Loading…' : summaryText(monthSummary(totals.data ?? []))}
        </p>
      )}
    </>
  )
}
