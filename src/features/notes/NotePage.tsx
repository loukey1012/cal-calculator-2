import { useEffect, useId, useRef, useState } from 'react'
import { useLeaveGuard } from '../../app/leaveGuard'
import { Button } from '../../components/ios/Button'
import { clearNoteDraft, readNoteDraft, writeNoteDraft, type NoteDraft } from './noteDraft'
import { NOTE_MAX_LENGTH } from './notePages'
import { useNoteFieldHeight } from './useNoteFieldHeight'

const DISCARD_QUESTION = 'Discard changes?'
const REPLACE_QUESTION = 'This note was changed meanwhile. Replace it with yours?'

type NotePageProps = {
  /** the page's address: the unsaved text and the back-swipe guard are kept by it */
  readonly path: string
  /** what the note is for, e.g. "Wednesday, 21 October · Dinner" */
  readonly subtitle: string
  /** the saved note; undefined until it is known (then nothing can be saved over it) */
  readonly saved: string | null | undefined
  /** loading the saved note failed (and it isn't known) */
  readonly loadFailed?: boolean
  readonly onRetry?: () => void
  /** called with the new text; empty removes the note */
  readonly onSave: (note: string) => void
  /** goes back to the day or meal */
  readonly onClose: () => void
}

/** What a screen reader hears about the length: only when it gets tight, not per keystroke. */
function limitStatus(length: number): string {
  const left = NOTE_MAX_LENGTH - length
  if (left <= 0) return 'Limit reached'
  if (left <= 10) return '10 characters left'
  if (left <= 50) return '50 characters left'
  return ''
}

/**
 * A note on a full page: Cancel / Done, the text area above the keyboard and the length. Until
 * it is edited it follows the saved note (a change from the partner shows). Unsaved text is kept
 * by the page's address until Done or a confirmed discard. Done saves through the day's queued
 * changes, so it works offline.
 */
export function NotePage({
  path,
  subtitle,
  saved,
  loadFailed = false,
  onRetry,
  onSave,
  onClose,
}: NotePageProps) {
  const field = useRef<HTMLTextAreaElement>(null)
  const subtitleId = useId()
  const [edit, setEdit] = useState<NoteDraft | null>(() => readNoteDraft(path))
  const loaded = saved !== undefined
  const savedText = saved ?? ''
  const text = edit?.text ?? savedText
  const changed = edit !== null && edit.text.trim() !== savedText
  const height = useNoteFieldHeight(field)

  useEffect(() => {
    if (loaded) field.current?.focus()
  }, [loaded])

  function discard() {
    clearNoteDraft(path)
  }

  const canLeave = () => {
    if (!changed) return true
    if (!window.confirm(DISCARD_QUESTION)) return false
    discard()
    return true
  }
  useLeaveGuard(path, canLeave)

  function change(value: string) {
    if (value === savedText) {
      setEdit(null)
      discard()
      return
    }
    const next = { text: value, base: edit?.base ?? savedText }
    setEdit(next)
    writeNoteDraft(path, next)
  }

  function cancel() {
    if (!canLeave()) return
    discard()
    onClose()
  }

  function done() {
    if (changed && edit) {
      // the saved note moved on since this edit began (the partner wrote): don't overwrite quietly
      if (edit.base !== savedText && !window.confirm(REPLACE_QUESTION)) return
      onSave(edit.text)
    }
    discard()
    onClose()
  }

  return (
    <div className="mb-[calc(-1*(var(--tabbar-height)+var(--tabbar-bottom)+24px))] pt-3">
      <div className="flex min-h-11 items-center justify-between">
        <Button variant="plain" className="-ml-2 !font-normal" onClick={cancel}>
          Cancel
        </Button>
        <h1 className="font-display text-[17px] font-bold">Note</h1>
        <Button variant="plain" className="-mr-2 font-bold" disabled={!loaded} onClick={done}>
          Done
        </Button>
      </div>
      <p id={subtitleId} className="caption text-center">
        {subtitle}
      </p>
      {loadFailed && (
        <div role="alert" className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[15px] text-label-secondary">Couldn't load the note.</p>
          <Button variant="plain" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
      <textarea
        ref={field}
        aria-label="Note"
        aria-describedby={subtitleId}
        aria-busy={!loaded}
        value={text}
        readOnly={!loaded}
        maxLength={NOTE_MAX_LENGTH}
        style={{ height }}
        className="glass-surface mt-3 block w-full resize-none rounded-[18px] bg-bg-elevated p-3 text-[17px] text-label shadow-card outline-none"
        onChange={(event) => change(event.target.value)}
      />
      <p className="mt-2 text-right text-[13px] text-label-secondary">
        {text.length} / {NOTE_MAX_LENGTH}
      </p>
      <p role="status" aria-live="polite" className="sr-only">
        {limitStatus(text.length)}
      </p>
    </div>
  )
}
