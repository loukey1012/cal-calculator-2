import { GroupedSection } from '../../components/ios/GroupedSection'
import { mealLabel } from '../meals/dayModel'
import { formatSpan } from '../trends/trendFormat'
import type { MonthNote } from './monthStats'

type MonthNotesProps = {
  readonly notes: readonly MonthNote[]
  readonly onOpenDay: (date: string) => void
}

/** Every note of the month with its day; a tap opens that day. */
export function MonthNotes({ notes, onOpenDay }: MonthNotesProps) {
  if (notes.length === 0) return null
  return (
    <GroupedSection header="Notes of the month" region>
      <ul className="divide-y divide-separator">
        {notes.map((note) => (
          <li key={`${note.date}-${note.mealType ?? 'day'}`}>
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
        ))}
      </ul>
    </GroupedSection>
  )
}
