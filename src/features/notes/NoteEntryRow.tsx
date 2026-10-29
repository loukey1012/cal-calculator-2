import { ChevronRightIcon } from '../../components/ios/icons'

type NoteEntryRowProps = {
  /** the saved note, or null/empty when there is none */
  readonly note: string | null | undefined
  /** which note: "Day" or a meal's name, so the rows of a day and its meals differ for a screen reader */
  readonly label: string
  readonly onOpen: () => void
}

/**
 * A row for the note of a day or meal: the caption "Note" and a one-line preview, or "Add a note"
 * when there is none. Tapping it opens the note page.
 */
export function NoteEntryRow({ note, label, onOpen }: NoteEntryRowProps) {
  const text = note?.trim() ?? ''
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${label} note: ${text || 'Add a note'}`}
      className="glass-surface flex w-full items-center gap-3 rounded-[18px] bg-bg-elevated px-3.5 py-2.5 text-left shadow-card transition-transform active:scale-[0.99]"
    >
      <span className="text-[12px] font-bold tracking-wide text-label-secondary uppercase">
        Note
      </span>
      <span
        className={`min-w-0 flex-1 truncate text-[15px] ${text ? 'text-label' : 'text-label-secondary'}`}
      >
        {text || 'Add a note'}
      </span>
      <ChevronRightIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-label-secondary" />
    </button>
  )
}
