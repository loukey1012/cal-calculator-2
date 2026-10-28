import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { fromLocalDateString } from '../../lib/dates'
import type { Profile } from '../household/householdApi'
import { DayView } from '../today/DayView'
import { DayWeight } from '../weight/DayWeight'
import { scrollToDayOf } from './historyState'

const DAY_TITLE: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }

type SelectedDayProps = {
  readonly day: string
  readonly today: string
  readonly person: Profile
  readonly isOwnDay: boolean
}

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

/** The opened day beneath the calendar, fully editable. */
export function SelectedDay({ day, today, person, isOwnDay }: SelectedDayProps) {
  const title = new Intl.DateTimeFormat(undefined, DAY_TITLE).format(fromLocalDateString(day))
  const section = useRef<HTMLElement>(null)
  // A tapped note asks for the scroll in the navigation state, which survives the page being
  // mounted again for the day's address. Every navigation is a new entry (location.key), so the
  // request is acted on once, and later navigation (which carries none) scrolls nothing.
  const { key, state } = useLocation()
  const scrollRequested = scrollToDayOf(state)
  useEffect(() => {
    if (!scrollRequested) return
    section.current?.scrollIntoView?.({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [key, scrollRequested])
  return (
    <section
      ref={section}
      aria-labelledby="history-day-title"
      className="mt-5 scroll-mt-[calc(env(safe-area-inset-top)+8px)]"
    >
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
