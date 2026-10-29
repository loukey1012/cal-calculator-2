import { useState } from 'react'
import { useLocation } from 'react-router'
import { useCurrentUser } from '../../app/currentUser'
import { usePagePath } from '../../app/pagePath'
import { personOf } from '../../app/stackNavigate'
import { MealRoute } from '../meals/MealPage'
import { mealPageOf } from '../meals/mealPages'
import { DayNoteRoute } from '../notes/NoteRoutes'
import { dayNotePageOf } from '../notes/notePages'
import { PageHeader } from '../../components/ios/PageHeader'
import { fromLocalDateString } from '../../lib/dates'
import { usePeople } from '../household/hooks'
import { PersonSwitch } from '../household/PersonSwitch'
import { WeightButton } from '../weight/WeightButton'
import { DayView } from './DayView'
import { useToday } from './useToday'

const DATE_FORMAT: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }

/** Today, or a meal of today opened on top of it. */
export function TodayPage() {
  const path = usePagePath()
  const page = mealPageOf(path)
  const dayNote = dayNotePageOf(path)
  if (dayNote) return <DayNoteRoute page={dayNote} />
  return page ? <MealRoute page={page} /> : <TodayDay />
}

function TodayDay() {
  const { profile, householdId } = useCurrentUser()
  const today = useToday()
  const people = usePeople(profile, householdId)
  const { state } = useLocation()
  // below a meal (and back from it) the person whose meal it is stays picked
  const [selectedId, setSelectedId] = useState(() => personOf(state) ?? profile.id)
  const person = people.find((member) => member.id === selectedId) ?? profile
  const dateLabel = new Intl.DateTimeFormat(undefined, DATE_FORMAT).format(
    fromLocalDateString(today),
  )

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={dateLabel}
        titleAccessory={
          <WeightButton
            key={person.id}
            userId={person.id}
            today={today}
            isOwn={person.id === profile.id}
          />
        }
      />
      <PersonSwitch people={people} selectedId={person.id} onChange={setSelectedId} />
      <DayView key={person.id} person={person} isOwnDay={person.id === profile.id} date={today} />
    </>
  )
}
