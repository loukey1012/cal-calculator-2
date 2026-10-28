import { mealLabel } from '../meals/dayModel'
import { formatSpan } from '../trends/trendFormat'
import type { MonthNote } from './monthStats'

type NoteRowProps = {
  readonly note: MonthNote
  readonly onOpenDay: (date: string) => void
}

/** One note with its day: the short date, then "Dinner · text" (or the day note's text). */
export function NoteRow({ note, onOpenDay }: NoteRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpenDay(note.date)}
        className="flex min-h-14 w-full flex-col items-start gap-0.5 px-4 py-3 text-left active:bg-fill"
      >
        <span className="text-[13px] font-semibold text-label-secondary">
          {formatSpan(note.date, note.date)}
        </span>
        <span className="line-clamp-2 text-[15px] font-medium">
          {note.mealType ? `${mealLabel(note.mealType)} · ${note.text}` : note.text}
        </span>
      </button>
    </li>
  )
}
