/**
 * Text recognition of a photo, on the phone (tesseract.js, German and English). The engine and
 * its language files come from the app itself (__OCR_BASE__, see vite.config ocrAssets), are
 * loaded only here and kept by the service worker after the first use, so it works offline too.
 */

export type RecognizeStep = 'preparing' | 'loading' | 'reading'

// a phone photo is ~12 MP; this is plenty for a nutrition table and much faster to read
const MAX_SIDE_PX = 2000
const JPEG_QUALITY = 0.92

/** The photo made smaller (keeping its proportions), so reading takes seconds, not minutes. */
async function downscaled(photo: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(photo)
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height))
  if (scale === 1) {
    bitmap.close()
    return photo
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? photo), 'image/jpeg', JPEG_QUALITY)
  })
}

/** The text in the photo, line by line. */
export async function recognizeText(
  photo: Blob,
  onStep: (step: RecognizeStep) => void = () => {},
): Promise<string> {
  onStep('preparing')
  const image = await downscaled(photo)
  onStep('loading')
  const { createWorker, OEM } = await import('tesseract.js')
  // full addresses: the worker resolves its files from its own script, not from the page
  const base = new URL(__OCR_BASE__, window.location.origin).href
  const worker = await createWorker(['deu', 'eng'], OEM.LSTM_ONLY, {
    workerPath: `${base}/worker.min.js`,
    corePath: `${base}/core`,
    langPath: `${base}/lang`,
    gzip: true,
    // loaded from the app's address, so the service worker can keep it for offline use
    workerBlobURL: false,
    // the service worker already keeps the language files; a second copy isn't needed
    cacheMethod: 'none',
  })
  try {
    onStep('reading')
    const { data } = await worker.recognize(image)
    return data.text
  } finally {
    await worker.terminate()
  }
}
