import { useId, useRef, useState, type ChangeEvent } from 'react'
import { parseNutritionLabel, type LabelReading } from './labelParser'
import type { RecognizeStep } from './recognize'

const STEP_TEXT: Readonly<Record<RecognizeStep, string>> = {
  preparing: 'Preparing the photo…',
  // the first time, the text recognition is downloaded (about 8 MB)
  loading: 'Loading text recognition… (takes a moment the first time)',
  reading: 'Reading the label…',
}

const NOTHING_FOUND =
  'No nutrition table found. Take the photo straight on, with the table filling most of it.'
const FAILED = 'Couldn’t read the photo. Try again.'

type Status =
  | { readonly kind: 'idle' }
  | { readonly kind: 'working'; readonly step: RecognizeStep }
  | { readonly kind: 'error'; readonly message: string }

type ReadLabelRowProps = {
  /** values were found; nothing is saved until the form is */
  readonly onRead: (reading: LabelReading) => void
}

/**
 * Reads a photo of a nutrition table (taken now or from the photos) on the phone and hands its
 * values per 100 g or ml to the form.
 */
export function ReadLabelRow({ onRead }: ReadLabelRowProps) {
  const inputId = useId()
  const photoInput = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const working = status.kind === 'working'

  async function read(event: ChangeEvent<HTMLInputElement>) {
    const photo = event.target.files?.[0]
    // the same photo can be picked again after a failed read
    event.target.value = ''
    if (!photo) return
    try {
      // loaded only now: the text recognition is large
      const { recognizeText } = await import('./recognize')
      const text = await recognizeText(photo, (step) => setStatus({ kind: 'working', step }))
      const reading = parseNutritionLabel(text)
      if (reading.found === 0) {
        setStatus({ kind: 'error', message: NOTHING_FOUND })
        return
      }
      setStatus({ kind: 'idle' })
      onRead(reading)
    } catch {
      setStatus({ kind: 'error', message: FAILED })
    }
  }

  return (
    <div className="px-4 py-3">
      <label htmlFor={inputId} className="sr-only">
        Photo of the nutrition label
      </label>
      {/* no capture: iOS offers the camera or the photo library */}
      <input
        ref={photoInput}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => void read(event)}
      />
      <button
        type="button"
        disabled={working}
        onClick={() => photoInput.current?.click()}
        className="block w-full text-left text-[17px] text-accent-ink active:opacity-60 disabled:opacity-40"
      >
        Read nutrition label
      </button>
      {working && (
        <p role="status" className="mt-1 text-[13px] text-label-secondary">
          {STEP_TEXT[status.step]}
        </p>
      )}
      {status.kind === 'error' && (
        <p role="alert" className="mt-1 text-[13px] text-destructive">
          {status.message}
        </p>
      )}
    </div>
  )
}
