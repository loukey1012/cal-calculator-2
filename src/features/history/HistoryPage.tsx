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
import { TrendsView } from '../trends/TrendsView'
import { useToday } from '../today/useToday'
import { monthStart } from './calendar'
import { HistoryCalendarView } from './HistoryCalendarView'
import { HistoryNotesView } from './HistoryNotesView'
import { monthOf, notesQueryOf, viewOf, type HistoryState, type HistoryView } from './historyState'
import { monthFilterOf, type MonthFilter } from './monthStats'
import { SelectedDay } from './SelectedDay'

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
  const page = mealPageOf(usePagePath())
  return page ? <MealRoute page={page} /> : <HistoryMonth />
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
  // kept here (not in the Notes view) so it survives opening a note and coming back
  const [notesQuery, setNotesQuery] = useState(() => notesQueryOf(location.state))
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
    // a filter and the view are part of what was shown too: coming from elsewhere carries none
    setFilter(monthFilterOf(location.state))
    setView(viewOf(location.state))
    setNotesQuery(notesQueryOf(location.state))
  }

  // The picked person, the month, the filter, the view and the notes search ride along in the navigation state:
  // another day is another address, which mounts the page again, and only the state tells it
  // what was shown. Selecting replaces the entry: browsing days builds no back stack.
  function goTo(path: string, changes: Partial<HistoryState>) {
    const state: HistoryState = {
      person: person.id,
      month,
      filter,
      view,
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
    goTo(`/history/${day}`, { month: monthStart(day), view: 'calendar', scrollToDay: true })
  }
  function selectPerson(personId: string) {
    setSelectedId(personId)
    goTo(pathname, { person: personId })
  }
  function changeMonth(shown: string) {
    setMonth(shown)
    goTo(pathname, { month: shown })
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
      <PageHeader title="History" />
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
            today={today}
            selectedDay={selectedDay}
            filter={filter}
            onChangeMonth={changeMonth}
            onChangeFilter={changeFilter}
            onSelectDay={toggleDay}
          />
          {selectedDay ? (
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
