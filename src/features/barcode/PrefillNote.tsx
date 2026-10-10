import { useId } from 'react'
import { Button } from '../../components/ios/Button'
import type { ProductInfo } from './openFoodFacts'

type PrefillNoteProps = {
  readonly text: string
  /** gaps in the product data, to fill in by hand */
  readonly warnings: readonly string[]
  /** what the package says; null when the product wasn't found */
  readonly info: ProductInfo | null
  /** puts the form back to the values from Open Food Facts */
  readonly onReset?: () => void
}

function packageLine({ pack, portion }: ProductInfo): string {
  return [pack && `Pack ${pack}`, portion && `Portion ${portion}`].filter(Boolean).join(' · ')
}

/** Where a new ingredient's values came from, and what's missing, above its form. */
export function PrefillNote({ text, warnings, info, onReset }: PrefillNoteProps) {
  const headingId = useId()
  const details = info ? packageLine(info) : ''
  return (
    <div className="mb-3 space-y-2">
      <div className="flex items-center gap-3 rounded-2xl bg-accent-soft px-4 py-3">
        {info?.imageUrl && (
          <img
            src={info.imageUrl}
            alt="Product photo"
            referrerPolicy="no-referrer"
            className="h-14 w-14 shrink-0 rounded-xl bg-bg-elevated object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p role="status" className="text-[14px] font-semibold text-accent-ink">
            {text}
          </p>
          {details && <p className="mt-0.5 text-[13px] text-accent-ink/80">{details}</p>}
        </div>
      </div>
      {info && onReset && (
        <Button
          variant="plain"
          className="-ml-2 text-[15px]"
          onClick={() => {
            if (
              window.confirm('Put back the values from Open Food Facts? Your changes are lost.')
            ) {
              onReset()
            }
          }}
        >
          Reset to the values from Open Food Facts
        </Button>
      )}
      {warnings.length > 0 && (
        <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-[14px] text-destructive">
          <p id={headingId} className="font-bold">
            Check the product data
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
