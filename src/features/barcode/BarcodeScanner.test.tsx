import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('./reader', () => ({ loadBarcodeReader: vi.fn(), readImageFile: vi.fn() }))

import { BarcodeScanner } from './BarcodeScanner'
import { loadBarcodeReader, readImageFile } from './reader'

const NUTELLA = '3017620422003'

function fakeStream() {
  const track = {
    stop: vi.fn(),
    getCapabilities: () => ({ torch: true }),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
  }
  return { track, stream: { getTracks: () => [track], getVideoTracks: () => [track] } }
}

function withCamera(getUserMedia: () => Promise<unknown>) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(getUserMedia) },
  })
}

function renderScanner() {
  const onResult = vi.fn()
  const onClose = vi.fn()
  render(<BarcodeScanner onResult={onResult} onClose={onClose} />)
  return { onResult, onClose }
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.mocked(loadBarcodeReader).mockResolvedValue({ read: vi.fn().mockResolvedValue(null) })
})

afterEach(() => {
  Reflect.deleteProperty(navigator, 'mediaDevices')
  vi.restoreAllMocks()
})

describe('BarcodeScanner', () => {
  test('reads a barcode from the live camera, then turns the camera off', async () => {
    // Arrange
    const { stream, track } = fakeStream()
    withCamera(() => Promise.resolve(stream))
    const read = vi.fn().mockResolvedValueOnce(null).mockResolvedValue(NUTELLA)
    vi.mocked(loadBarcodeReader).mockResolvedValue({ read })

    // Act
    const { onResult } = renderScanner()

    // Assert
    expect(screen.getByRole('dialog', { name: 'Scan barcode' })).toBeInTheDocument()
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(NUTELLA))
    expect(onResult).toHaveBeenCalledTimes(1)
    expect(track.stop).toHaveBeenCalled()
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: false, video: expect.objectContaining({}) }),
    )
  })

  test('the torch can be switched on where the phone allows it', async () => {
    const { stream, track } = fakeStream()
    withCamera(() => Promise.resolve(stream))
    const user = userEvent.setup()
    renderScanner()

    const torch = await screen.findByRole('switch', { name: 'Torch' })
    await user.click(torch)

    expect(track.applyConstraints).toHaveBeenCalledWith({ advanced: [{ torch: true }] })
    expect(torch).toBeChecked()
  })

  test('closing turns the camera off', async () => {
    const { stream, track } = fakeStream()
    withCamera(() => Promise.resolve(stream))
    const user = userEvent.setup()
    const { onClose } = renderScanner()
    await screen.findByRole('switch', { name: 'Torch' })

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalled()
    expect(track.stop).toHaveBeenCalled()
  })

  test('without camera access it says so and offers a photo or typing the number', async () => {
    withCamera(() => Promise.reject(new DOMException('denied', 'NotAllowedError')))
    renderScanner()

    expect(await screen.findByText(/Camera access is off/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Take photo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Type number' })).toBeInTheDocument()
  })

  test('without any camera (e.g. a computer) it says so too', async () => {
    renderScanner()

    expect(await screen.findByText(/No camera available/)).toBeInTheDocument()
  })

  test('a typed number is checked before it is used', async () => {
    const user = userEvent.setup()
    const { onResult } = renderScanner()

    await user.click(screen.getByRole('button', { name: 'Type number' }))
    const field = screen.getByLabelText('Barcode number')
    await user.type(field, '3017620422004')
    await user.click(screen.getByRole('button', { name: 'Use number' }))
    expect(screen.getByText('Not a valid barcode')).toBeInTheDocument()
    await user.clear(field)
    await user.type(field, '3017620 422003')
    await user.click(screen.getByRole('button', { name: 'Use number' }))

    expect(onResult).toHaveBeenCalledWith(NUTELLA)
  })

  test('a photo of the barcode works when the live camera does not', async () => {
    vi.mocked(readImageFile).mockResolvedValueOnce(null).mockResolvedValueOnce(NUTELLA)
    const user = userEvent.setup()
    const { onResult } = renderScanner()
    const photo = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText('Photo of the barcode')

    await user.upload(input, photo)
    expect(await screen.findByText(/No barcode found in the photo/)).toBeInTheDocument()
    await user.upload(input, photo)

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(NUTELLA))
    expect(readImageFile).toHaveBeenCalledWith(photo)
  })

  test('a photo still being read when the scanner closes is ignored', async () => {
    let finishReading: (barcode: string) => void = () => undefined
    vi.mocked(readImageFile).mockImplementation(
      () => new Promise((resolve) => (finishReading = resolve)),
    )
    const user = userEvent.setup()
    const { onResult, onClose } = renderScanner()
    await user.upload(
      screen.getByLabelText('Photo of the barcode'),
      new File(['x'], 'p.jpg', { type: 'image/jpeg' }),
    )
    expect(screen.getByText('Reading the photo…')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    await act(async () => finishReading(NUTELLA))

    expect(onClose).toHaveBeenCalled()
    expect(onResult).not.toHaveBeenCalled()
  })

  test('back from the background with a frozen camera, it starts the camera again', async () => {
    const first = fakeStream()
    const second = fakeStream()
    Object.assign(first.track, { readyState: 'live', muted: true })
    const streams = [first.stream, second.stream]
    withCamera(() => Promise.resolve(streams.shift()))
    renderScanner()
    await screen.findByRole('switch', { name: 'Torch' })

    act(() => document.dispatchEvent(new Event('visibilitychange')))

    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2))
    expect(first.track.stop).toHaveBeenCalled()
  })

  test('the scanner engine failing to load still leaves photo and typing', async () => {
    const { stream } = fakeStream()
    withCamera(() => Promise.resolve(stream))
    vi.mocked(loadBarcodeReader).mockRejectedValue(new Error('offline'))
    renderScanner()

    expect(await screen.findByText(/Couldn’t start the scanner/)).toBeInTheDocument()
    await act(async () => {})
    expect(screen.getByRole('button', { name: 'Type number' })).toBeInTheDocument()
  })
})
