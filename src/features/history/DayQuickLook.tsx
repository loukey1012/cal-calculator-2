import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { fromLocalDateString } from '../../lib/dates'
import { MEAL_TYPES } from '../meals/dayModel'
import { useDay, useDayNote } from '../meals/hooks'
import { formatKcal } from '../nutrition/format'
import { DayNoteCard } from '../today/DayNoteCard'
import { DayStatusPill } from './DayStatusPill'
import type { DayStatusInput } from './dayStatusPill'

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
  readonly onClose: () => void
}

/**
 * The quick look at a held day: the verdict, the calories and the notes. It closes with Escape or
 * a tap outside; the calendar closes it when the finger is lifted. It is drawn on the page, as
 * the calendar sits inside transformed parents (the tab and page slides) that would hold a fixed
 * card to themselves. It doesn't take the focus: the finger is still down.
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
  onClose,
}: DayQuickLookProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  // the listeners below stay in place when the caller passes another function
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) onCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [])

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
      className="glass-surface fixed inset-x-0 top-1/3 z-30 mx-auto flex w-[min(320px,calc(100%-2rem))] flex-col items-start gap-2 rounded-[24px] bg-bg-elevated p-4 shadow-card"
    >
      <p className="font-display text-[17px] font-bold">
        {TITLE.format(fromLocalDateString(date))}
      </p>
      {status && <DayStatusPill input={status} />}
      <p className="text-[15px] font-semibold tabular-nums">
        {hasFood ? calories : 'Nothing logged'}
      </p>
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
