import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { CameraIcon, FlashlightIcon, KeypadIcon } from '../../components/ios/icons'
import { normalizeBarcode } from './barcode'
import { readImageFile } from './reader'
import { useBarcodeCamera, type BarcodeCamera } from './useBarcodeCamera'

// index.html mount point; the scanner is portalled outside it
const APP_ROOT_ID = 'root'
const NOTHING_IN_PHOTO =
  'No barcode found in the photo. Try again closer, with the barcode flat and sharp.'
const PHOTO_FAILED = 'Couldn’t read the photo. Try again, or type the number.'

type BarcodeScannerProps = {
  /** a valid barcode, as stored (see normalizeBarcode) */
  readonly onResult: (barcode: string) => void
  readonly onClose: () => void
}

/** Full-screen scanner: live camera, with a photo and typing the number as fallbacks. */
export function BarcodeScanner({ onResult, onClose }: BarcodeScannerProps) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const [typing, setTyping] = useState(false)
  const [photoMessage, setPhotoMessage] = useState<string | null>(null)
  // set once a barcode was delivered or the scanner closed: nothing may arrive after that
  const finished = useRef(false)
  const { videoRef, ...camera } = useBarcodeCamera(deliver)

  useModal(panel, close)

  function deliver(barcode: string) {
    if (finished.current) return
    finished.current = true
    camera.stop()
    onResult(barcode)
  }

  function close() {
    finished.current = true
    camera.stop()
    onClose()
  }

  async function readPhoto(file: File) {
    setPhotoMessage('Reading the photo…')
    const barcode = await readImageFile(file).catch(() => undefined)
    if (finished.current) return
    if (barcode) deliver(barcode)
    else setPhotoMessage(barcode === null ? NOTHING_IN_PHOTO : PHOTO_FAILED)
  }

  const message = photoMessage ?? (camera.state.kind === 'problem' ? camera.state.message : null)

  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-x-0 top-0 bottom-screen-edge z-50 flex flex-col overflow-hidden bg-black text-white outline-none"
    >
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <ScannerTop titleId={titleId} torch={camera.torch} onClose={close} />
      <div className="relative flex flex-1 flex-col items-center justify-center px-6">
        {camera.state.kind === 'problem' ? (
          <CameraIcon className="h-14 w-14 text-white/50" />
        ) : (
          <ScanFrame />
        )}
        <p
          role="status"
          className="relative z-10 mt-6 max-w-[320px] text-center text-[15px] font-semibold"
        >
          {message ??
            (camera.state.kind === 'starting'
              ? 'Starting the camera…'
              : 'Hold the barcode inside the frame')}
        </p>
      </div>
      <div className="relative z-10 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
        {typing ? (
          <TypedNumber onResult={deliver} onCancel={() => setTyping(false)} />
        ) : (
          <Fallbacks onPhoto={(file) => void readPhoto(file)} onType={() => setTyping(true)} />
        )}
      </div>
    </div>,
    document.body,
  )
}

/** The app behind is inert; focus moves in and returns to the scan button; Escape closes. */
function useModal(panel: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })
  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const appRoot = document.getElementById(APP_ROOT_ID)
    appRoot?.setAttribute('inert', '')
    panel.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      appRoot?.removeAttribute('inert')
      previousFocus?.focus()
    }
  }, [panel])
}

const GLASS_BUTTON =
  'flex min-h-11 items-center justify-center gap-2 rounded-full bg-white/15 px-4 text-[15px] font-semibold text-white backdrop-blur-md active:bg-white/25'

type ScannerTopProps = {
  readonly titleId: string
  readonly torch: BarcodeCamera['torch']
  readonly onClose: () => void
}

function ScannerTop({ titleId, torch, onClose }: ScannerTopProps) {
  return (
    <div className="relative z-10 flex items-center justify-between gap-3 px-4 pt-[max(env(safe-area-inset-top),16px)] pb-2">
      <button type="button" onClick={onClose} className={GLASS_BUTTON}>
        Close
      </button>
      <h2 id={titleId} className="text-[17px] font-bold">
        Scan barcode
      </h2>
      {torch ? (
        <button
          type="button"
          role="switch"
          aria-checked={torch.on}
          aria-label="Torch"
          onClick={torch.toggle}
          className={`grid h-11 w-11 place-items-center rounded-full backdrop-blur-md ${
            torch.on ? 'bg-white text-black' : 'bg-white/15 text-white'
          }`}
        >
          <FlashlightIcon className="h-5 w-5" />
        </button>
      ) : (
        // keeps the title centred
        <span className="w-11" />
      )}
    </div>
  )
}

/** Dims everything around a rounded window with corner marks. */
function ScanFrame() {
  return (
    <div
      aria-hidden="true"
      className="relative aspect-[1.6] w-[min(78vw,340px)] rounded-[28px] shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
    >
      <span className="absolute -top-0.5 -left-0.5 h-9 w-9 rounded-tl-[28px] border-t-4 border-l-4 border-white" />
      <span className="absolute -top-0.5 -right-0.5 h-9 w-9 rounded-tr-[28px] border-t-4 border-r-4 border-white" />
      <span className="absolute -bottom-0.5 -left-0.5 h-9 w-9 rounded-bl-[28px] border-b-4 border-l-4 border-white" />
      <span className="absolute -right-0.5 -bottom-0.5 h-9 w-9 rounded-br-[28px] border-r-4 border-b-4 border-white" />
      <span className="absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-accent/90 motion-safe:animate-pulse" />
    </div>
  )
}

type FallbacksProps = {
  readonly onPhoto: (file: File) => void
  readonly onType: () => void
}

function Fallbacks({ onPhoto, onType }: FallbacksProps) {
  const photoInput = useRef<HTMLInputElement>(null)
  const inputId = useId()

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // the same photo can be chosen again after a failed read
    event.target.value = ''
    if (file) onPhoto(file)
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <label htmlFor={inputId} className="sr-only">
        Photo of the barcode
      </label>
      <input
        ref={photoInput}
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={choose}
      />
      <button type="button" className={GLASS_BUTTON} onClick={() => photoInput.current?.click()}>
        <CameraIcon className="h-5 w-5" />
        Take photo
      </button>
      <button type="button" className={GLASS_BUTTON} onClick={onType}>
        <KeypadIcon className="h-5 w-5" />
        Type number
      </button>
    </div>
  )
}

type TypedNumberProps = {
  readonly onResult: (barcode: string) => void
  readonly onCancel: () => void
}

function TypedNumber({ onResult, onCancel }: TypedNumberProps) {
  const inputId = useId()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const barcode = normalizeBarcode(value)
    if (barcode) onResult(barcode)
    else setError('Not a valid barcode')
  }

  return (
    <form noValidate onSubmit={submit} className="rounded-3xl bg-bg-elevated p-4 text-label">
      <label htmlFor={inputId} className="text-[13px] font-semibold text-label-secondary">
        Barcode number
      </label>
      <input
        id={inputId}
        autoFocus
        inputMode="numeric"
        autoComplete="off"
        placeholder="The digits under the barcode"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        onChange={(event) => {
          setValue(event.target.value)
          setError(null)
        }}
        className="mt-1 w-full bg-transparent text-[22px] font-semibold tracking-wider outline-none placeholder:text-[17px] placeholder:font-normal placeholder:tracking-normal placeholder:text-label-secondary"
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-[13px] text-destructive">
          {error}
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-full bg-fill text-[15px] font-semibold"
        >
          Back to camera
        </button>
        <button
          type="submit"
          className="min-h-11 rounded-full bg-accent text-[15px] font-semibold text-white"
        >
          Use number
        </button>
      </div>
    </form>
  )
}
