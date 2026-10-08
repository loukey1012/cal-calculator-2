import { useId } from 'react'
import { ScanBarcodeButton } from './ScanBarcodeButton'

type BarcodeFieldProps = {
  readonly value: string
  readonly error?: string
  readonly onChange: (value: string) => void
}

/** The ingredient form's barcode: typed, or filled in by scanning the package. */
export function BarcodeField({ value, error, onChange }: BarcodeFieldProps) {
  const id = useId()
  return (
    <div className="py-2 pr-3 pl-4">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="sr-only">
          Barcode
        </label>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Barcode"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent py-1 text-[17px] text-label outline-none placeholder:text-label-secondary"
        />
        <ScanBarcodeButton onScanned={onChange} />
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-[13px] text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
