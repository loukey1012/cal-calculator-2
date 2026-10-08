import { useId } from 'react'

type PrefillNoteProps = {
  readonly text: string
  /** odd values in the product data, to check by hand */
  readonly warnings: readonly string[]
}

/** Where a new ingredient's values came from, and what looks wrong, above its form. */
export function PrefillNote({ text, warnings }: PrefillNoteProps) {
  const headingId = useId()
  return (
    <div className="mb-3 space-y-2">
      <p
        role="status"
        className="rounded-2xl bg-accent-soft px-4 py-3 text-[14px] font-semibold text-accent-ink"
      >
        {text}
      </p>
      {warnings.length > 0 && (
        <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-[14px] text-destructive">
          <p id={headingId} className="font-bold">
            Check these values
          </p>
          <ul aria-labelledby={headingId} className="mt-1 list-disc space-y-1 pl-5 font-medium">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
