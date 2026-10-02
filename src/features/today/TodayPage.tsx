import { useState } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { PageHeader } from '../../components/ios/PageHeader'
import { fromLocalDateString } from '../../lib/dates'
import { usePeople } from '../household/hooks'
import { PersonSwitch } from '../household/PersonSwitch'
import { DayView } from './DayView'
import { useToday } from './useToday'

const DATE_FORMAT: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }

export function TodayPage() {
  const { profile, householdId } = useCurrentUser()
  const today = useToday()
  const people = usePeople(profile, householdId)
  const [selectedId, setSelectedId] = useState(profile.id)
  const person = people.find((member) => member.id === selectedId) ?? profile
  const dateLabel = new Intl.DateTimeFormat(undefined, DATE_FORMAT).format(
    fromLocalDateString(today),
  )

  return (
    <>
      <PageHeader title="Today" subtitle={dateLabel} />
      <PersonSwitch people={people} selectedId={person.id} onChange={setSelectedId} />
      <DayView key={person.id} person={person} isOwnDay={person.id === profile.id} date={today} />
    </>
  )
}
