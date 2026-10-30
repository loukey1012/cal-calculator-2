import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { fromLocalDateString } from '../../lib/dates'
import { MEAL_TYPES } from '../meals/dayModel'
import { useDay, useDayNote } from '../meals/hooks'
import { formatKcal } from '../nutrition/format'
import { DayNoteCard } from '../today/DayNoteCard'
import { DayFlagButtons } from '../dayMarks/DayFlagButtons'
import { useDayFlags } from '../dayMarks/useDayFlags'
import { DayStatusPill } from './DayStatusPill'
import { swallowClickOfThisPress } from './swallowNextClick'
import type { DayStatusInput } from './dayStatusPill'

/** the marker the Popover puts on its card */
const POPOVER_SELECTOR = '[data-popover]'

const TITLE: Intl.DateTimeFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

type DayQuickLookProps = {
  readonly userId: string
  readonly date: string
  readonly kcal: number
  readonly estimated: boolean
  /** the calorie goal of that day, if any */
  readonly goalKcal: number | null
  /** what the status pill says; null for a day with nothing to judge */
  readonly status: DayStatusInput | null
  /** something was logged that day */
  readonly hasFood: boolean
  /** a note on the day or on one of its meals */
  readonly hasNote: boolean
  /** the person's household; without one there is no Sex button */
  readonly householdId: string | null
  /** whose day it is, when it's the partner's (the flag buttons say so) */
  readonly partnerName?: string | null
  /** the finger has lifted: the card stays open and takes the focus */
  readonly pinned?: boolean
  readonly onClose: () => void
}

/**
 * The quick look at a held day: the verdict, the calories, the day's flag buttons and the notes.
 * It stays after the finger is lifted (`pinned`) and closes with Escape, a tap outside or when
 * the calendar closes it. The Cheat list of the flag buttons is a popover of its own: a tap in it
 * is not outside, and Escape closes the list first. It is drawn on the page, as the calendar sits
 * inside transformed parents (the tab and page slides) that would hold a fixed card to
 * themselves. It takes the focus only once pinned: until then the finger is still down.
 */
export function DayQuickLook({
  userId,
  date,
  kcal,
  estimated,
  goalKcal,
  status,
  hasFood,
  hasNote,
  householdId,
  partnerName = null,
  pinned = false,
  onClose,
}: DayQuickLookProps) {
  const flags = useDayFlags({ userId, householdId, date })
  const cardRef = useRef<HTMLDivElement>(null)
  // the listeners below stay in place when the caller passes another function
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    // on the window: an open Cheat list handles Escape on the document first and stops it there
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element
      // the Cheat list is drawn in the body, not in the card, but belongs to it
      if (cardRef.current?.contains(target) || target.closest(POPOVER_SELECTOR)) return
      // like an iOS menu, the tap that dismisses it does nothing else (it opens no day)
      swallowClickOfThisPress()
      onCloseRef.current()
    }
    // the card is portalled to the body, so it must not outlive the app being left
    const onLeave = () => {
      if (document.visibilityState === 'hidden') onCloseRef.current()
    }
    const onPageHide = () => onCloseRef.current()
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('visibilitychange', onLeave)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('visibilitychange', onLeave)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [])

  // the focus moves into the card once pinned and, when the card goes, back to where it was
  const focusBefore = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!pinned) return
    const card = cardRef.current
    const active = document.activeElement
    focusBefore.current =
      active instanceof HTMLElement && active !== document.body
        ? active
        : document.querySelector<HTMLElement>(`button[data-date="${date}"]`)
    card?.focus({ preventScroll: true })
    return () => {
      // the card is gone now, so focus that was in it is on the body; focus the user moved to
      // something else stays there
      const now = document.activeElement
      if (!now || now === document.body || card?.contains(now)) {
        focusBefore.current?.focus({ preventScroll: true })
      }
    }
  }, [pinned, date])

  const tilde = estimated ? '~' : ''
  const calories =
    goalKcal === null
      ? `${tilde}${formatKcal(kcal)} kcal`
      : `${tilde}${formatKcal(kcal)} of ${formatKcal(goalKcal)} kcal`

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label={TITLE.format(fromLocalDateString(date))}
      tabIndex={-1}
      className="glass-surface fixed inset-x-0 top-1/3 z-30 mx-auto flex w-[min(320px,calc(100%-2rem))] flex-col items-start gap-2 rounded-[24px] bg-bg-elevated p-4 shadow-card outline-none select-none [-webkit-touch-callout:none]"
    >
      <p className="font-display text-[17px] font-bold">
        {TITLE.format(fromLocalDateString(date))}
      </p>
      {status && <DayStatusPill input={status} />}
      <p className="text-[15px] font-semibold tabular-nums">
        {hasFood ? calories : 'Nothing logged'}
      </p>
      <DayFlagButtons key={`${userId}|${date}`} flags={flags} partnerName={partnerName} />
      {hasNote && <QuickLookNotes userId={userId} date={date} />}
    </div>,
    document.body,
  )
}

/** The day's note as a card, then the notes of its meals, e.g. "Dinner: Pizza with colleagues". */
function QuickLookNotes({ userId, date }: { readonly userId: string; readonly date: string }) {
  const dayNote = useDayNote(userId, date).data ?? null
  const meals = useDay(userId, date).data ?? []
  const mealNotes = MEAL_TYPES.flatMap(({ type, label }) =>
    meals
      .filter((meal) => meal.meal_type === type && meal.note)
      .map((meal) => ({ id: meal.id, text: `${label}: ${meal.note}` })),
  )
  return (
    <>
      {dayNote && <DayNoteCard note={dayNote} />}
      {mealNotes.map(({ id, text }) => (
        <p
          key={id}
          className="w-full text-[13px] break-words whitespace-pre-line text-label-secondary"
        >
          {text}
        </p>
      ))}
    </>
  )
}
