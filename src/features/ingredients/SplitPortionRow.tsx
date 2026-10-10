import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { InputRow } from '../../components/ios/FormRows'
import { parseDecimal } from '../../lib/numbers'
import { isSplitCount, portionCount } from './formActions'

type SplitPortionRowProps = {
  /** the portion as printed on the package, e.g. "3 Kekse (30 g)" */
  readonly packagePortion: string | null
  /** pre-fill the package's count (not once it was split) */
  readonly suggestCount: boolean
  readonly onSplit: (parts: number) => void
}

/**
 * When the values per unit are for a portion of several pieces (e.g. 3 biscuits), splits them
 * so that one unit is one piece.
 */
export function SplitPortionRow({ packagePortion, suggestCount, onSplit }: SplitPortionRowProps) {
  const suggested = suggestCount ? portionCount(packagePortion) : null
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(suggested === null ? '' : String(suggested))
  const parts = parseDecimal(text)

  function split() {
    if (!isSplitCount(parts)) return
    onSplit(parts)
    setOpen(false)
  }

  return (
    <>
      {packagePortion && (
        <p className="px-4 py-2.5 text-[15px] text-label-secondary">
          Portion on the package: {packagePortion}
        </p>
      )}
      {open ? (
        <>
          <InputRow
            label="One portion is"
            accessibleLabel="Units in one portion"
            suffix="units"
            inputMode="decimal"
            placeholder="e.g. 3"
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            // Return splits; it must not save the ingredient form around it
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              split()
            }}
          />
          <div className="flex items-center justify-end gap-2 py-1 pr-2 pl-4">
            <p className="flex-1 text-[13px] text-label-secondary">
              Divides every value per unit and the grams per unit.
            </p>
            <Button variant="plain" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="plain" disabled={!isSplitCount(parts)} onClick={split}>
              Split
            </Button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full px-4 py-3 text-left text-[17px] text-accent-ink active:opacity-60"
        >
          Split into smaller units…
        </button>
      )}
    </>
  )
}
