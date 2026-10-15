import { useId } from 'react'
import { Button } from '../../components/ios/Button'
import type { ValueWarning } from './valueChecks'

/** Marking a saved ingredient's values as correct although they are flagged. */
export type ValuesConfirmation = {
  readonly marked: boolean
  readonly pending: boolean
  readonly onMark: () => void
  readonly onUndo: () => void
}

type ValueWarningsProps = {
  readonly warnings: readonly ValueWarning[]
  /** only for the saved values of an ingredient being edited */
  readonly confirmation?: ValuesConfirmation
}

/** Values that look wrong, updated while typing; the rows are marked too. */
export function ValueWarnings({ warnings, confirmation }: ValueWarningsProps) {
  const headingId = useId()
  if (warnings.length === 0) return null
  const marked = confirmation?.marked ?? false
  return (
    <div
      role="status"
      className={`mt-6 rounded-2xl px-4 py-3 text-[14px] ${
        marked ? 'bg-fill text-label-secondary' : 'bg-destructive/10 text-destructive'
      }`}
    >
      <p id={headingId} className="font-bold">
        {marked ? 'Marked as correct' : 'Check these values'}
      </p>
      <ul aria-labelledby={headingId} className="mt-1 list-disc space-y-1 pl-5 font-medium">
        {warnings.map(({ text }) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      {confirmation && (
        <div className="-mb-1 flex justify-end">
          <Button
            variant="plain"
            type="button"
            loading={confirmation.pending}
            onClick={marked ? confirmation.onUndo : confirmation.onMark}
          >
            {marked ? 'Undo' : 'Values are correct'}
          </Button>
        </div>
      )}
    </div>
  )
}
