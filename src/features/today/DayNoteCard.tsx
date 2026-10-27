import { useId } from 'react'
import { NoteIcon } from '../../components/ios/icons'

/** The day's note in full, read as "Note" and then its text. */
export function DayNoteCard({ note }: { readonly note: string }) {
  const labelId = useId()
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="glass-surface flex w-full items-start gap-2.5 rounded-[18px] bg-bg-elevated p-3 shadow-card"
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-ink">
        <NoteIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p id={labelId} className="text-[12px] font-bold text-label-secondary">
          Note
        </p>
        <p className="break-words whitespace-pre-line text-[15px]">{note}</p>
      </div>
    </div>
  )
}
