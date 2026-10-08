import { useEffect, useRef, useState } from 'react'
import { normalizeBarcode } from './barcode'
import { loadBarcodeReader } from './reader'

/** Live camera scanning: the back camera into the video, read a few times a second. */

const READ_INTERVAL_MS = 150
const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
}

export const NO_CAMERA = 'No camera available. Take a photo of the barcode or type its number.'
export const CAMERA_BLOCKED =
  'Camera access is off. Allow it for this app, or take a photo or type the number instead.'
const CAMERA_FAILED = 'Couldn’t start the camera. Take a photo or type the number instead.'
export const SCANNER_FAILED =
  'Couldn’t start the scanner. Check your connection, or type the number instead.'

export type CameraState =
  | { readonly kind: 'starting' }
  | { readonly kind: 'scanning' }
  | { readonly kind: 'problem'; readonly message: string }

// not in the DOM types yet; iPhones (iOS 17.4+) and Android phones report it on the back camera
type TorchCapabilities = MediaTrackCapabilities & { readonly torch?: boolean }

function cameraProblem(error: unknown): string {
  if (!(error instanceof DOMException)) return CAMERA_FAILED
  if (error.name === 'NotAllowedError' || error.name === 'SecurityError') return CAMERA_BLOCKED
  if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') return NO_CAMERA
  return CAMERA_FAILED
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function torchTrack(stream: MediaStream): MediaStreamTrack | null {
  const [track] = stream.getVideoTracks()
  const capabilities: TorchCapabilities | undefined = track?.getCapabilities?.()
  return track && capabilities?.torch === true ? track : null
}

export type BarcodeCamera = {
  /** for the <video> showing the camera */
  readonly videoRef: React.RefObject<HTMLVideoElement | null>
  readonly state: CameraState
  /** null where the phone has no torch for this camera */
  readonly torch: { readonly on: boolean; readonly toggle: () => void } | null
  /** turns the camera off now, e.g. before closing */
  readonly stop: () => void
}

/** `onCode` gets the first valid barcode seen; the camera is off by then. */
export function useBarcodeCamera(onCode: (barcode: string) => void): BarcodeCamera {
  const video = useRef<HTMLVideoElement | null>(null)
  const [state, setState] = useState<CameraState>({ kind: 'starting' })
  const [track, setTrack] = useState<MediaStreamTrack | null>(null)
  const [torchOn, setTorchOn] = useState(false)
  // iOS ends the camera while the app is in the background; coming back starts it again
  const [restarts, setRestarts] = useState(0)
  const streamRef = useRef<MediaStream | null>(null)
  // ends the running camera and its reading, from outside the effect too
  const finishRef = useRef<() => void>(() => undefined)
  const onCodeRef = useRef(onCode)
  useEffect(() => {
    onCodeRef.current = onCode
  })

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const finish = () => {
      active = false
      clearTimeout(timer)
      stopStream(streamRef.current)
      streamRef.current = null
      setTrack(null)
    }
    finishRef.current = finish

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState({ kind: 'problem', message: NO_CAMERA })
        return
      }
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS)
      } catch (error) {
        if (active) setState({ kind: 'problem', message: cameraProblem(error) })
        return
      }
      if (!active) return stopStream(stream)
      streamRef.current = stream
      const element = video.current
      if (element) {
        element.srcObject = stream
        // muted inline video plays without a tap; a refusal shows a still frame, reading goes on
        await element.play().catch(() => undefined)
      }
      const reader = await loadBarcodeReader().catch(() => null)
      if (!active) return
      if (!reader) {
        finish()
        setState({ kind: 'problem', message: SCANNER_FAILED })
        return
      }
      setTrack(torchTrack(stream))
      setState({ kind: 'scanning' })

      const readFrame = async () => {
        if (!active || !element) return
        // a frame that isn't ready yet just reads nothing
        const raw = await reader.read(element).catch(() => null)
        const barcode = raw === null ? null : normalizeBarcode(raw)
        if (!active) return
        if (barcode) {
          finish()
          onCodeRef.current(barcode)
          return
        }
        timer = setTimeout(() => void readFrame(), READ_INTERVAL_MS)
      }
      void readFrame()
    }

    void start()
    return finish
  }, [restarts])

  useEffect(() => {
    const onVisible = () => {
      // iOS may end the track, or keep it "live" but muted with a frozen picture
      const stalled = streamRef.current
        ?.getVideoTracks()
        .some((t) => t.readyState === 'ended' || t.muted)
      if (document.visibilityState === 'visible' && stalled) {
        setTorchOn(false)
        setRestarts((count) => count + 1)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return {
    videoRef: video,
    state,
    torch: track
      ? {
          on: torchOn,
          toggle: () => {
            const next = !torchOn
            void track
              .applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
              .then(() => setTorchOn(next))
              .catch(() => undefined)
          },
        }
      : null,
    stop: () => finishRef.current(),
  }
}
