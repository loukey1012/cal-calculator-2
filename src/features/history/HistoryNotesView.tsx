import { useId } from 'react'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { SearchField } from '../../components/ios/SearchField'
import { fromLocalDateString } from '../../lib/dates'
import { toUserMessage } from '../../lib/errors'
import { useAllNotes } from './hooks'
import { groupNotesByMonth, notesMatching, type NoteGroup } from './noteGroups'
import { NoteRow } from './NoteRow'

const MONTH_TITLE = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })

type HistoryNotesViewProps = {
  readonly userId: string
  /** the search text; kept by the page, so it is still there after a note was opened */
  readonly query: string
  readonly onChangeQuery: (query: string) => void
  /** a tap on a note: show its day in the calendar */
  readonly onOpenDay: (date: string) => void
}

/** Every note of the person, newest first under a heading per month, with a search. */
export function HistoryNotesView({
  userId,
  query,
  onChangeQuery,
  onOpenDay,
}: HistoryNotesViewProps) {
  const notes = useAllNotes(userId)

  if (notes.isError && notes.data === undefined) {
    return <ErrorBanner message={toUserMessage(notes.error)} />
  }
  if (notes.data === undefined) return <StatusText>Loading…</StatusText>
  if (notes.data.length === 0) return <StatusText>No notes yet.</StatusText>

  const groups = groupNotesByMonth(notesMatching(notes.data, query))
  return (
    <>
      <div className="mt-4">
        <SearchField
          label="Search notes"
          placeholder="Search notes"
          value={query}
          onChange={onChangeQuery}
        />
      </div>
      {groups.length === 0 ? (
        <StatusText>{`No notes match “${query.trim()}”.`}</StatusText>
      ) : (
        groups.map((group) => <MonthGroup key={group.month} group={group} onOpenDay={onOpenDay} />)
      )}
    </>
  )
}

function StatusText({ children }: { readonly children: string }) {
  return <p className="mt-6 text-center text-[15px] text-label-secondary">{children}</p>
}

function MonthGroup({
  group,
  onOpenDay,
}: {
  readonly group: NoteGroup
  readonly onOpenDay: (date: string) => void
}) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="mt-6">
      <h2 id={headingId} className="caption px-4 pb-2">
        {MONTH_TITLE.format(fromLocalDateString(group.month))}
      </h2>
      <ul className="glass-surface divide-y divide-separator overflow-hidden rounded-3xl bg-bg-elevated shadow-card">
        {group.notes.map((note) => (
          <NoteRow
            key={`${note.date}-${note.mealType ?? 'day'}`}
            note={note}
            onOpenDay={onOpenDay}
          />
        ))}
      </ul>
    </section>
  )
}
