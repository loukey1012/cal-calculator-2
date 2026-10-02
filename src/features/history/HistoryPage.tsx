import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useCurrentUser } from '../../app/currentUser'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { PageHeader } from '../../components/ios/PageHeader'
import { fromLocalDateString, toLocalDateString } from '../../lib/dates'
import { toUserMessage } from '../../lib/errors'
import { useGoals } from '../goals/hooks'
import { usePeople } from '../household/hooks'
import type { Profile } from '../household/householdApi'
import { PersonSwitch } from '../household/PersonSwitch'
import { formatGrams, formatKcal } from '../nutrition/format'
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

function summaryText({ loggedDays, averageKcal, averageProtein }: MonthSummary): string {
  if (loggedDays === 0) return 'Nothing logged this month.'
  const days = loggedDays === 1 ? '1 day logged' : `${loggedDays} days logged`
  const kcal = `${days} · Ø ${formatKcal(averageKcal)} kcal`
  // no protein data at all would read as a misleading "0.0 g"
  return averageProtein > 0 ? `${kcal} · Ø ${formatGrams(averageProtein)} g protein` : kcal
}

export function HistoryPage() {
  const { profile, householdId } = useCurrentUser()
  const today = useToday()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const people = usePeople(profile, householdId)
  const [selectedId, setSelectedId] = useState(profile.id)
  const person = people.find((member) => member.id === selectedId) ?? profile
  const [month, setMonth] = useState(() => monthStart(today))

  const requestedDay = DAY_ROUTE.exec(pathname)?.[1]
  // only real days up to today can be opened; anything else falls back to the calendar
  const openDay =
    requestedDay !== undefined && isRealDay(requestedDay) && requestedDay <= today
      ? requestedDay
      : null

  // the tab keeps its scroll position; switching between calendar and a day starts at the top
  const top = useRef<HTMLDivElement>(null)
  useEffect(() => {
    top.current?.scrollIntoView?.({ block: 'start' })
  }, [openDay])

  const personSwitch = (
    <PersonSwitch people={people} selectedId={person.id} onChange={setSelectedId} />
  )

  if (openDay) {
    return (
      <>
        <div ref={top} />
        <PageHeader
          title={new Intl.DateTimeFormat(undefined, DAY_TITLE).format(fromLocalDateString(openDay))}
          leading={
            <Button
              variant="plain"
              aria-label="Back to History"
              className="-ml-2"
              onClick={() => navigate('/history')}
            >
              ‹ History
            </Button>
          }
        />
        {personSwitch}
        <DayView
          key={person.id}
          person={person}
          isOwnDay={person.id === profile.id}
          date={openDay}
        />
      </>
    )
  }

  return (
    <>
      <div ref={top} />
      <PageHeader title="History" />
      {personSwitch}
      <MonthOverview
        key={person.id}
        person={person}
        month={month}
        today={today}
        onChangeMonth={setMonth}
        onOpenDay={(day) => {
          setMonth(monthStart(day))
          navigate(`/history/${day}`)
        }}
      />
    </>
  )
}

type MonthOverviewProps = {
  readonly person: Profile
  readonly month: string
  readonly today: string
  readonly onChangeMonth: (month: string) => void
  readonly onOpenDay: (day: string) => void
}

function MonthOverview({ person, month, today, onChangeMonth, onOpenDay }: MonthOverviewProps) {
  const totals = useMonthTotals(person.id, month)
  const goals = useGoals(person.id)
  const byDate = new Map((totals.data ?? []).map((total) => [total.date, total]))

  return (
    <>
      <MonthCalendar
        month={month}
        today={today}
        statusOf={(day) => dayStatus(byDate.get(day), goals.data ?? [])}
        onSelectDay={onOpenDay}
        onChangeMonth={onChangeMonth}
      />
      {totals.isError && totals.data === undefined ? (
        <ErrorBanner message={toUserMessage(totals.error)} />
      ) : (
        <p data-testid="month-summary" className="mt-3 px-4 text-[15px] text-label-secondary">
          {totals.isPending ? 'Loading…' : summaryText(monthSummary(totals.data ?? []))}
        </p>
      )}
    </>
  )
}
