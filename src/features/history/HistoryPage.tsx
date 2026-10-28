import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useCurrentUser } from '../../app/currentUser'
import { usePagePath } from '../../app/pagePath'
import { personOf } from '../../app/stackNavigate'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { PageHeader } from '../../components/ios/PageHeader'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { fromLocalDateString, toLocalDateString } from '../../lib/dates'
import { toUserMessage } from '../../lib/errors'
import { roundTo } from '../../lib/numbers'
import { useGoals } from '../goals/hooks'
import { goalForDate, type Goal } from '../nutrition/goals'
import { usePeople } from '../household/hooks'
import type { Profile } from '../household/householdApi'
import { PersonSwitch } from '../household/PersonSwitch'
import { formatGrams, formatKcalTotal } from '../nutrition/format'
import { MealRoute } from '../meals/MealPage'
import { mealPageOf } from '../meals/mealPages'
import { DayView } from '../today/DayView'
import { TrendsView } from '../trends/TrendsView'
import { DayWeight } from '../weight/DayWeight'
import type { WeightEntry } from '../weight/weight'
import { useWeights } from '../weight/hooks'
import { useToday } from '../today/useToday'
import { formatSigned } from '../trends/trendFormat'
import {
  dayStatus,
  monthStart,
  monthSummary,
  weekAverageKcal,
  type DayTotal,
  type MonthSummary,
} from './calendar'
import { CalendarKey } from './CalendarKey'
import { DayQuickLook } from './DayQuickLook'
import { useMonthNotes, useMonthTotals, useWeekEdgeTotals } from './hooks'
import { MonthCalendar } from './MonthCalendar'
import { MonthFilterChips } from './MonthFilterChips'
import { MonthNotes } from './MonthNotes'
import {
  filterMatches,
  monthFilterOf,
  monthGoalStats,
  noteDatesOf,
  weightChangeInMonth,
  type MonthFilter,
  type MonthGoalStats,
} from './monthStats'

const DAY_ROUTE = /^\/history\/(\d{4}-\d{2}-\d{2})$/
const DAY_TITLE: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }

function isRealDay(day: string): boolean {
  return toLocalDateString(fromLocalDateString(day)) === day
}

const dayCount = (count: number) => (count === 1 ? '1 day' : `${count} days`)

function averagesText({
  loggedDays,
  averageKcal,
  averageProtein,
  estimated,
}: MonthSummary): string {
  const kcal = `${dayCount(loggedDays)} logged · Ø ${formatKcalTotal({ kcal: averageKcal, estimated })} kcal`
  // no protein data at all would read as a misleading "0.0 g"
  return averageProtein > 0 ? `${kcal} · Ø ${formatGrams(averageProtein)} g protein` : kcal
}

function summaryText(summary: MonthSummary): string {
  const { loggedDays, leftOutDays } = summary
  if (loggedDays === 0 && leftOutDays === 0) return 'Nothing logged this month.'
  // cheat days, alcohol days and days with a cheat meal aren't in the averages
  const parts = [
    loggedDays > 0 ? averagesText(summary) : null,
    leftOutDays > 0 ? `${dayCount(leftOutDays)} left out` : null,
  ]
  return parts.filter((part) => part !== null).join(' · ')
}

function highlightsText(
  { withinGoal, judgedDays, longestStreak }: MonthGoalStats,
  weightChange: number | null,
): string {
  const parts = [
    judgedDays > 0 ? `${withinGoal} of ${dayCount(judgedDays)} within goal` : null,
    longestStreak > 0 ? `Longest streak ${dayCount(longestStreak)}` : null,
    weightChange !== null ? `Weight ${formatSigned('weight', roundTo(weightChange, 1))}` : null,
  ]
  return parts.filter((part) => part !== null).join(' · ')
}

type HistoryView = 'calendar' | 'trends'

const VIEW_OPTIONS = [
  { value: 'calendar', label: 'Calendar' },
  { value: 'trends', label: 'Trends' },
] as const satisfies ReadonlyArray<{ value: HistoryView; label: string }>

/**
 * Month calendar (the selected day, kept in the URL, opens beneath it, fully editable) or the
 * trends of calories, nutrients and weight.
 */
export function HistoryPage() {
  const page = mealPageOf(usePagePath())
  return page ? <MealRoute page={page} /> : <HistoryMonth />
}

/** What History showed, kept in the navigation state; `person` as for any page of the stack. */
type HistoryState = {
  readonly person: string
  readonly month: string
  readonly filter: MonthFilter | null
}

function monthOf(state: unknown): string | null {
  if (typeof state !== 'object' || state === null || !('month' in state)) return null
  return typeof state.month === 'string' ? state.month : null
}

function HistoryMonth() {
  const { profile, householdId } = useCurrentUser()
  const today = useToday()
  const location = useLocation()
  // the page stack also shows History below a meal, for its own address
  const pathname = usePagePath()
  const navigate = useNavigate()
  const people = usePeople(profile, householdId)
  const [selectedId, setSelectedId] = useState(() => personOf(location.state) ?? profile.id)
  const [filter, setFilter] = useState(() => monthFilterOf(location.state))
  const [view, setView] = useState<HistoryView>('calendar')
  // a note was tapped: the opened day scrolls into view once it is shown
  const [scrollToDay, setScrollToDay] = useState(false)
  const person = people.find((member) => member.id === selectedId) ?? profile

  const requestedDay = DAY_ROUTE.exec(pathname)?.[1]
  // only real days up to today can be opened; anything else shows just the calendar
  const selectedDay =
    requestedDay !== undefined && isRealDay(requestedDay) && requestedDay <= today
      ? requestedDay
      : null
  const [month, setMonth] = useState(
    () => monthOf(location.state) ?? monthStart(selectedDay ?? today),
  )

  // opened from elsewhere for someone's day (the review's Open day): that person and its month
  const [seenNavigation, setSeenNavigation] = useState(location.key)
  if (seenNavigation !== location.key) {
    setSeenNavigation(location.key)
    const person = personOf(location.state)
    if (person) setSelectedId(person)
    const shownMonth = monthOf(location.state) ?? (selectedDay && monthStart(selectedDay))
    if (shownMonth) setMonth(shownMonth)
    // a filter is part of what was shown too: coming from elsewhere carries none
    setFilter(monthFilterOf(location.state))
  }

  // The picked person and the month shown ride along in the navigation state: another day is
  // another address, which mounts the page again, and only the state tells it what was shown.
  // Selecting replaces the entry: browsing days builds no back stack.
  function goTo(path: string, state: HistoryState) {
    navigate(path, { replace: true, state })
  }
  function toggleDay(day: string) {
    goTo(day === selectedDay ? '/history' : `/history/${day}`, {
      person: person.id,
      month,
      filter,
    })
  }
  function openDay(day: string) {
    setScrollToDay(true)
    if (day !== selectedDay) toggleDay(day)
  }
  function selectPerson(personId: string) {
    setSelectedId(personId)
    goTo(pathname, { person: personId, month, filter })
  }
  function changeMonth(shown: string) {
    setMonth(shown)
    goTo(pathname, { person: person.id, month: shown, filter })
  }
  function changeFilter(chosen: MonthFilter | null) {
    setFilter(chosen)
    goTo(pathname, { person: person.id, month, filter: chosen })
  }

  return (
    <>
      <PageHeader title="History" />
      <PersonSwitch people={people} selectedId={person.id} onChange={selectPerson} />
      <div className="mt-3">
        <SegmentedControl label="View" options={VIEW_OPTIONS} value={view} onChange={setView} />
      </div>
      {view === 'trends' ? (
        <TrendsView
          key={person.id}
          userId={person.id}
          isOwn={person.id === profile.id}
          today={today}
        />
      ) : (
        <>
          <MonthOverview
            key={person.id}
            person={person}
            month={month}
            today={today}
            selectedDay={selectedDay}
            filter={filter}
            onChangeMonth={changeMonth}
            onChangeFilter={changeFilter}
            onSelectDay={toggleDay}
            onOpenDay={openDay}
          />
          {selectedDay ? (
            <SelectedDay
              day={selectedDay}
              today={today}
              person={person}
              isOwnDay={person.id === profile.id}
              scrollRequested={scrollToDay}
              onScrolled={() => setScrollToDay(false)}
            />
          ) : (
            <p className="mt-6 text-center text-[15px] text-label-secondary">
              Tap a day to see what was eaten.
            </p>
          )}
        </>
      )}
    </>
  )
}

type SelectedDayProps = {
  readonly day: string
  readonly today: string
  readonly person: Profile
  readonly isOwnDay: boolean
  /** bring the day into view (a note was tapped); `onScrolled` is called once it has been */
  readonly scrollRequested: boolean
  readonly onScrolled: () => void
}

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

function SelectedDay({
  day,
  today,
  person,
  isOwnDay,
  scrollRequested,
  onScrolled,
}: SelectedDayProps) {
  const title = new Intl.DateTimeFormat(undefined, DAY_TITLE).format(fromLocalDateString(day))
  const section = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!scrollRequested) return
    section.current?.scrollIntoView?.({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    })
    onScrolled()
  }, [scrollRequested, onScrolled])
  return (
    <section ref={section} aria-labelledby="history-day-title" className="mt-6">
      <h2 id="history-day-title" className="px-1 font-display text-[22px] font-bold">
        {title}
      </h2>
      <DayView key={person.id} person={person} isOwnDay={isOwnDay} date={day} showStatus />
      <div className="mt-4">
        <DayWeight userId={person.id} date={day} today={today} isOwnDay={isOwnDay} />
      </div>
    </section>
  )
}

type MonthOverviewProps = {
  readonly person: Profile
  readonly month: string
  readonly today: string
  readonly selectedDay: string | null
  readonly filter: MonthFilter | null
  readonly onChangeMonth: (month: string) => void
  readonly onChangeFilter: (filter: MonthFilter | null) => void
  readonly onSelectDay: (day: string) => void
  /** like `onSelectDay`, but an open day stays open */
  readonly onOpenDay: (day: string) => void
}

function MonthOverview({
  person,
  month,
  today,
  selectedDay,
  filter,
  onChangeMonth,
  onChangeFilter,
  onSelectDay,
  onOpenDay,
}: MonthOverviewProps) {
  const totals = useMonthTotals(person.id, month)
  const goals = useGoals(person.id)
  const edgeTotals = useWeekEdgeTotals(person.id, month, today)
  const notes = useMonthNotes(person.id, month)
  const weights = useWeights(person.id)
  const byDate = new Map((totals.data ?? []).map((total) => [total.date, total]))
  // a week across two months averages all its days: the edge days only count there
  const byDateInWeeks = new Map(
    [...(edgeTotals.data ?? []), ...(totals.data ?? [])].map((total) => [total.date, total]),
  )
  const notedDays = noteDatesOf(notes.data ?? [])
  const statusOf = (day: string) => dayStatus(day, byDate.get(day), goals.data ?? [], today)
  const weighedDays = new Set((weights.data ?? []).map((entry) => entry.date))
  const notesFailed = notes.isError && notes.data === undefined
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
        renderQuickLook={(day, close) => {
          const total = byDate.get(day)
          const goal = goalForDate(goals.data ?? [], day)
          return (
            <DayQuickLook
              userId={person.id}
              date={day}
              kcal={total?.kcal ?? 0}
              estimated={total?.kcalEstimated === true}
              goalKcal={goal?.kcal ?? null}
              status={
                goals.data === undefined
                  ? null
                  : {
                      date: day,
                      today,
                      day: total ?? { date: day, mealCount: 0 },
                      kcal: total?.kcal ?? 0,
                      estimated: total?.kcalEstimated === true,
                      goal,
                    }
              }
              hasFood={(total?.mealCount ?? 0) > 0}
              hasNote={notedDays.has(day)}
              onClose={close}
            />
          )
        }}
      />
      <CalendarKey />
      <MonthFilterChips filter={filter} onChange={onChangeFilter} />
      {totals.isError && totals.data === undefined ? (
        <ErrorBanner message={toUserMessage(totals.error)} />
      ) : (
        <p
          data-testid="month-summary"
          className="mt-3 px-1 text-[14px] font-medium text-label-secondary"
        >
          {totals.isPending ? 'Loading…' : summaryText(monthSummary(totals.data ?? [], today))}
        </p>
      )}
      <MonthHighlights
        totals={totals.data}
        goals={goals.data}
        weights={weights.data}
        month={month}
        today={today}
      />
      {notesFailed ? (
        <ErrorBanner message={toUserMessage(notes.error)} />
      ) : (
        <MonthNotes notes={notes.data ?? []} onOpenDay={onOpenDay} />
      )}
    </>
  )
}

type MonthHighlightsProps = {
  readonly totals: readonly DayTotal[] | undefined
  readonly goals: readonly Goal[] | undefined
  readonly weights: readonly WeightEntry[] | undefined
  readonly month: string
  readonly today: string
}

/** Days within goal, the longest streak and the weight change; nothing while there is none. */
function MonthHighlights({ totals, goals, weights, month, today }: MonthHighlightsProps) {
  // without the goals every counted day would look like one without a goal
  if (totals === undefined || goals === undefined) return null
  const text = highlightsText(
    monthGoalStats(totals, goals, today),
    weightChangeInMonth(weights ?? [], month),
  )
  if (text === '') return null
  return (
    <p
      data-testid="month-highlights"
      className="mt-1 px-1 text-[14px] font-medium text-label-secondary"
    >
      {text}
    </p>
  )
}
