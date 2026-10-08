import { normalizeBarcode } from './barcode'

/**
 * Reads package barcodes from camera frames and photos with ZXing (WebAssembly), since iPhone
 * browsers have no barcode reader of their own. The engine is loaded on first use, from this
 * app (so it is cached for offline use), never from a CDN.
 */

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'itf'] as const
// big enough for a barcode across part of the photo, small enough to read quickly
const MAX_PHOTO_EDGE_PX = 1600

export type BarcodeReader = {
  /** the first valid package barcode in the image, or null */
  readonly read: (source: ImageBitmapSource) => Promise<string | null>
}

let loading: Promise<BarcodeReader> | null = null

async function createReader(): Promise<BarcodeReader> {
  const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ])
  await prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith('.wasm') ? wasmUrl : prefix + path,
    },
    fireImmediately: true,
  })
  const detector = new BarcodeDetector({ formats: [...FORMATS] })
  return {
    read: async (source) => {
      const found = await detector.detect(source)
      return found.map((barcode) => normalizeBarcode(barcode.rawValue)).find(Boolean) ?? null
    },
  }
}

/** The shared reader; a failed load (e.g. offline before it was ever cached) is tried again. */
export function loadBarcodeReader(): Promise<BarcodeReader> {
  if (!loading) {
    loading = createReader()
    loading.catch(() => {
      loading = null
    })
  }
  return loading
}

function scaledDown(bitmap: ImageBitmap): HTMLCanvasElement | null {
  const scale = MAX_PHOTO_EDGE_PX / Math.max(bitmap.width, bitmap.height)
  if (scale >= 1) return null
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** A barcode in a photo: read small first (fast), then at full size if that found nothing. */
export async function readImageFile(file: Blob): Promise<string | null> {
  const reader = await loadBarcodeReader()
  const bitmap = await createImageBitmap(file)
  try {
    const small = scaledDown(bitmap)
    return (small && (await reader.read(small))) ?? (await reader.read(bitmap))
  } finally {
    bitmap.close()
  }
}
