import { usePagePath } from '../../app/pagePath'
import { useStackNavigate } from '../../app/stackNavigate'
import { fromLocalDateString } from '../../lib/dates'
import { mealLabel } from '../meals/dayModel'
import { useDay, useDayNote, useSetDayNote, useSetMealNote } from '../meals/hooks'
import type { MealPageRef } from '../meals/mealPages'
import { NotePage } from './NotePage'
import type { DayNotePage } from './notePages'

const DATE_FORMAT: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }

function subtitleOf(date: string, what: string): string {
  const day = new Intl.DateTimeFormat(undefined, DATE_FORMAT).format(fromLocalDateString(date))
  return `${day} · ${what}`
}

/** The page of a day's note, opened from Today or a History day. */
export function DayNoteRoute({ page }: { readonly page: DayNotePage }) {
  const { userId, date } = page.day
  const go = useStackNavigate()
  const note = useDayNote(userId, date)
  const setNote = useSetDayNote(userId, date)
  return (
    <NotePage
      path={usePagePath()}
      loadFailed={note.isError && note.data === undefined}
      onRetry={() => void note.refetch()}
      subtitle={subtitleOf(date, 'Day')}
      saved={note.data}
      onSave={setNote.mutate}
      onClose={() => go(page.parentPath)}
    />
  )
}

/** The page of a meal's note, below the meal page. */
export function MealNoteRoute({ page }: { readonly page: MealPageRef }) {
  const { meal, mealPath } = page
  const go = useStackNavigate()
  const day = useDay(meal.userId, meal.date)
  const setNote = useSetMealNote(meal.userId, meal.date)
  const saved =
    day.data === undefined
      ? undefined
      : (day.data.find((candidate) => candidate.meal_type === meal.mealType)?.note ?? null)
  return (
    <NotePage
      path={usePagePath()}
      loadFailed={day.isError && day.data === undefined}
      onRetry={() => void day.refetch()}
      subtitle={subtitleOf(meal.date, mealLabel(meal.mealType))}
      saved={saved}
      onSave={(note) => setNote.mutate({ mealType: meal.mealType, note })}
      onClose={() => go(mealPath)}
    />
  )
}
