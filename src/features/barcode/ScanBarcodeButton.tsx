import { useState } from 'react'
import { BarcodeIcon } from '../../components/ios/icons'
import { BarcodeScanner } from './BarcodeScanner'

type ScanBarcodeButtonProps = {
  /** a valid barcode, as stored */
  readonly onScanned: (barcode: string) => void
  /** e.g. while the ingredients a scan is matched against are still loading */
  readonly disabled?: boolean
}

/** A barcode icon that opens the full-screen scanner. */
export function ScanBarcodeButton({ onScanned, disabled = false }: ScanBarcodeButtonProps) {
  const [scanning, setScanning] = useState(false)
  return (
    <>
      <button
        type="button"
        aria-label="Scan barcode"
        disabled={disabled}
        onClick={() => setScanning(true)}
        className="-my-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-accent-ink active:bg-fill disabled:opacity-40"
      >
        <BarcodeIcon className="h-6 w-6" />
      </button>
      {scanning && (
        <BarcodeScanner
          onClose={() => setScanning(false)}
          onResult={(barcode) => {
            setScanning(false)
            onScanned(barcode)
          }}
        />
      )}
    </>
  )
}
