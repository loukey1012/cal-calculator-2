import { useId } from 'react'
import type { ValueWarning } from './valueChecks'

/** Values that look wrong, updated while typing; the rows are marked too. */
export function ValueWarnings({ warnings }: { readonly warnings: readonly ValueWarning[] }) {
  const headingId = useId()
  if (warnings.length === 0) return null
  return (
    <div
      role="status"
      className="mt-6 rounded-2xl bg-destructive/10 px-4 py-3 text-[14px] text-destructive"
    >
      <p id={headingId} className="font-bold">
        Check these values
      </p>
      <ul aria-labelledby={headingId} className="mt-1 list-disc space-y-1 pl-5 font-medium">
        {warnings.map(({ text }) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
    </div>
  )
}
