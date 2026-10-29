import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useCurrentUser } from '../../app/currentUser'
import { usePagePath } from '../../app/pagePath'
import { personOf } from '../../app/stackNavigate'
import { PageHeader } from '../../components/ios/PageHeader'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { fromLocalDateString, toLocalDateString } from '../../lib/dates'
import { usePeople } from '../household/hooks'
import { PersonSwitch } from '../household/PersonSwitch'
import { MealRoute } from '../meals/MealPage'
import { mealPageOf } from '../meals/mealPages'
import { DayNoteRoute } from '../notes/NoteRoutes'
import { dayNotePageOf } from '../notes/notePages'
import { TrendsView } from '../trends/TrendsView'
import { useToday } from '../today/useToday'
import { monthStart } from './calendar'
import { CalendarActions } from './CalendarActions'
import { HistoryCalendarView } from './HistoryCalendarView'
import { HistoryNotesView } from './HistoryNotesView'
import {
  calendarZoomOf,
  monthOf,
  notesQueryOf,
  viewOf,
  yearOf,
  type CalendarZoom,
  type HistoryState,
  type HistoryView,
} from './historyState'
import { monthFilterOf, type MonthFilter } from './monthStats'
import { SelectedDay } from './SelectedDay'
import { useKeyShown } from './useKeyShown'
import { useThisWeekSaved } from './week/useThisWeekSaved'
import { isoWeekOf, weekPageOf, weekPath } from './week/weekPages'
import { WeekRoute } from './week/WeekPage'

const DAY_ROUTE = /^\/history\/(\d{4}-\d{2}-\d{2})$/

function isRealDay(day: string): boolean {
  return toLocalDateString(fromLocalDateString(day)) === day
}

const VIEW_OPTIONS = [
  { value: 'calendar', label: 'Calendar' },
  { value: 'notes', label: 'Notes' },
  { value: 'trends', label: 'Trends' },
] as const satisfies ReadonlyArray<{ value: HistoryView; label: string }>

/**
 * Month calendar (the selected day, kept in the URL, opens beneath it, fully editable), all notes
 * with a search, or the trends of calories, nutrients and weight.
 */
export function HistoryPage() {
  const path = usePagePath()
  const page = mealPageOf(path)
  const week = weekPageOf(path, useToday())
  const dayNote = dayNotePageOf(path)
  if (dayNote) return <DayNoteRoute page={dayNote} />
  if (page) return <MealRoute page={page} />
  return week ? <WeekRoute week={week} /> : <HistoryMonth />
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
  const [view, setView] = useState<HistoryView>(() => viewOf(location.state))
  const [zoom, setZoom] = useState<CalendarZoom>(() => calendarZoomOf(location.state))
  // kept here (not in the Notes view) so it survives opening a note and coming back
  const [notesQuery, setNotesQuery] = useState(() => notesQueryOf(location.state))
  const [keyShown, setKeyShown] = useKeyShown()
  const person = people.find((member) => member.id === selectedId) ?? profile
  const thisWeekDetail = useThisWeekSaved(person.id, person.kcal_burned, today)

  const requestedDay = DAY_ROUTE.exec(pathname)?.[1]
  // only real days up to today can be opened; anything else shows just the calendar
  const selectedDay =
    requestedDay !== undefined && isRealDay(requestedDay) && requestedDay <= today
      ? requestedDay
      : null
  const [month, setMonth] = useState(
    () => monthOf(location.state) ?? monthStart(selectedDay ?? today),
  )

  const currentYear = Number(today.slice(0, 4))
  // a year in the future has no days: the year of the shown month stands in
  const stateYear = (state: unknown, fallbackMonth: string) => {
    const stated = yearOf(state)
    return stated !== null && stated <= currentYear ? stated : Number(fallbackMonth.slice(0, 4))
  }
  const [year, setYear] = useState(() => stateYear(location.state, month))

  // opened from elsewhere for someone's day (the review's Open day): that person and its month
  const [seenNavigation, setSeenNavigation] = useState(location.key)
  if (seenNavigation !== location.key) {
    setSeenNavigation(location.key)
    const person = personOf(location.state)
    if (person) setSelectedId(person)
    const shownMonth = monthOf(location.state) ?? (selectedDay && monthStart(selectedDay))
    if (shownMonth) setMonth(shownMonth)
    // a filter and the view are part of what was shown too: coming from elsewhere carries none
    setFilter(monthFilterOf(location.state))
    setView(viewOf(location.state))
    setZoom(calendarZoomOf(location.state))
    setYear(stateYear(location.state, shownMonth || month))
    setNotesQuery(notesQueryOf(location.state))
  }

  // The picked person, the month, the calendar zoom and year, the filter, the view and the notes search ride along in the navigation state:
  // another day is another address, which mounts the page again, and only the state tells it
  // what was shown. Selecting replaces the entry: browsing days builds no back stack.
  function goTo(path: string, changes: Partial<HistoryState>) {
    const state: HistoryState = {
      person: person.id,
      month,
      filter,
      view,
      calendarZoom: zoom,
      year,
      notesQuery,
      scrollToDay: false,
      ...changes,
    }
    navigate(path, { replace: true, state })
  }
  function toggleDay(day: string) {
    goTo(day === selectedDay ? '/history' : `/history/${day}`, { view: 'calendar' })
  }
  // a note was tapped: its day opens in the calendar (and stays open when it already was)
  function openDayOfNote(day: string) {
    goTo(`/history/${day}`, {
      month: monthStart(day),
      view: 'calendar',
      calendarZoom: 'month',
      scrollToDay: true,
    })
  }
  // a week of the calendar (or the running one) opens as a page over History
  function openWeek(weekDay: string) {
    goTo(weekPath(isoWeekOf(weekDay)), { weekOrigin: pathname })
  }
  function selectPerson(personId: string) {
    setSelectedId(personId)
    goTo(pathname, { person: personId })
  }
  function changeMonth(shown: string) {
    setMonth(shown)
    goTo(pathname, { month: shown })
  }
  function showYear() {
    const shownYear = Number(month.slice(0, 4))
    setZoom('year')
    setYear(shownYear)
    goTo(pathname, { calendarZoom: 'year', year: shownYear })
  }
  function changeYear(shown: number) {
    setYear(shown)
    goTo(pathname, { year: shown })
  }
  // a month of the overview opens in the calendar
  function openMonth(shown: string) {
    setMonth(shown)
    setZoom('month')
    goTo(pathname, { month: shown, calendarZoom: 'month' })
  }
  function changeView(chosen: HistoryView) {
    setView(chosen)
    goTo(pathname, { view: chosen })
  }
  function changeFilter(chosen: MonthFilter | null) {
    setFilter(chosen)
    goTo(pathname, { filter: chosen })
  }

  return (
    <>
      <PageHeader
        title="History"
        titleAccessory={
          view === 'calendar' ? (
            <CalendarActions
              filter={filter}
              onChangeFilter={changeFilter}
              keyShown={keyShown}
              onChangeKeyShown={setKeyShown}
              onShowYear={zoom === 'month' ? showYear : undefined}
              onOpenThisWeek={() => openWeek(today)}
              thisWeekDetail={thisWeekDetail}
            />
          ) : undefined
        }
      />
      <PersonSwitch people={people} selectedId={person.id} onChange={selectPerson} />
      <div className="mt-3">
        <SegmentedControl label="View" options={VIEW_OPTIONS} value={view} onChange={changeView} />
      </div>
      {view === 'trends' && (
        <TrendsView
          key={person.id}
          userId={person.id}
          isOwn={person.id === profile.id}
          today={today}
        />
      )}
      {view === 'notes' && (
        <HistoryNotesView
          key={person.id}
          userId={person.id}
          query={notesQuery}
          onChangeQuery={setNotesQuery}
          onOpenDay={openDayOfNote}
        />
      )}
      {view === 'calendar' && (
        <>
          <HistoryCalendarView
            key={person.id}
            person={person}
            month={month}
            zoom={zoom}
            year={year}
            today={today}
            selectedDay={selectedDay}
            filter={filter}
            onChangeMonth={changeMonth}
            onShowYear={showYear}
            onOpenMonth={openMonth}
            onChangeYear={changeYear}
            onChangeFilter={changeFilter}
            onSelectDay={toggleDay}
            onOpenWeek={(week) => openWeek(week[0] ?? today)}
            keyShown={keyShown}
          />
          {zoom === 'year' ? null : selectedDay ? (
            <SelectedDay
              day={selectedDay}
              today={today}
              person={person}
              isOwnDay={person.id === profile.id}
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
