import type { Block, Symbol as Glyph, Worker } from 'tesseract.js'
import {
  enhanceContrast,
  enlargement,
  tableRegion,
  textHeight,
  type Box,
  type PlacedWord,
} from './tableRegion'

/**
 * Text recognition of a photo, on the phone (tesseract.js, German and English). The engine and
 * its language files come from the app itself (__OCR_BASE__, see vite.config ocrAssets), are
 * loaded only here and kept by the service worker after the first use, so it works offline too.
 *
 * Two passes, so a small table on a big package needs no cropping: the whole photo is read to
 * find where the nutrition words are, then that part of the full-size photo is read on its own,
 * enlarged and with more contrast.
 */

export type RecognizeStep = 'preparing' | 'loading' | 'finding' | 'reading'

/**
 * The sizes the whole photo is searched at: big enough to find a small table's words on a
 * whole package; the smaller one only when that found none (a close-up, where letters of
 * 100 px aren't read at all).
 */
const FIND_SIDES_PX = [3200, 1600] as const
const JPEG_QUALITY = 0.92

/** The photo's `region` drawn at `scale`, optionally grey with stretched contrast. */
function drawn(
  bitmap: ImageBitmap,
  region: Box,
  scale: number,
  enhance: boolean,
): HTMLCanvasElement {
  const width = region.x1 - region.x0
  const height = region.y1 - region.y0
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext('2d')
  if (!context) return canvas
  context.drawImage(bitmap, region.x0, region.y0, width, height, 0, 0, canvas.width, canvas.height)
  if (enhance) {
    const image = context.getImageData(0, 0, canvas.width, canvas.height)
    context.putImageData(
      new ImageData(enhanceContrast(image.data), canvas.width, canvas.height),
      0,
      0,
    )
  }
  return canvas
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The photo could not be prepared'))),
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}

const LETTER = /[\p{L}\p{N}]/u

/** The median height of a word's letters and digits (borders read as "|" or "[" left out). */
function letterHeight(symbols: readonly Glyph[]): number | undefined {
  const heights = symbols
    .filter((symbol) => LETTER.test(symbol.text))
    .map((symbol) => symbol.bbox.y1 - symbol.bbox.y0)
    .toSorted((a, b) => a - b)
  return heights[Math.floor(heights.length / 2)]
}

/** Every recognised word, placed in the full-size photo's pixels. */
function wordsOf(blocks: readonly Block[] | null, scale: number): PlacedWord[] {
  return (blocks ?? []).flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines.flatMap((line) =>
        line.words.map((word) => ({
          text: word.text,
          letterHeight: (letterHeight(word.symbols) ?? word.bbox.y1 - word.bbox.y0) / scale,
          bbox: {
            x0: word.bbox.x0 / scale,
            y0: word.bbox.y0 / scale,
            x1: word.bbox.x1 / scale,
            y1: word.bbox.y1 / scale,
          },
        })),
      ),
    ),
  )
}

type Found = {
  /** the whole photo's text, read at this size */
  readonly text: string
  /** where the table is, in the full-size photo; null without one */
  readonly region: Box | null
  readonly textHeight: number
}

/** The whole photo read at most `side` px long, and where its nutrition table is. */
async function findTable(worker: Worker, bitmap: ImageBitmap, side: number): Promise<Found> {
  const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height))
  const whole = { x0: 0, y0: 0, x1: bitmap.width, y1: bitmap.height }
  const overview = await toBlob(drawn(bitmap, whole, scale, false))
  const { data } = await worker.recognize(overview, {}, { text: true, blocks: true })
  const words = wordsOf(data.blocks, scale)
  return {
    text: data.text,
    region: tableRegion(words, { width: bitmap.width, height: bitmap.height }),
    textHeight: textHeight(words),
  }
}

async function createReader(): Promise<Worker> {
  const { createWorker, OEM, PSM } = await import('tesseract.js')
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
  // the automatic layout (tesseract.js reads one uniform block by default, which garbles a
  // table with cell borders and a package with text all over)
  await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO })
  return worker
}

/**
 * The texts read from the photo: the cut-out nutrition table first (when one was found), then
 * the whole photo. The caller takes the one with the most values (labelParser.bestReading).
 */
export async function recognizeText(
  photo: Blob,
  onStep: (step: RecognizeStep) => void = () => {},
): Promise<string[]> {
  onStep('preparing')
  const bitmap = await createImageBitmap(photo)
  try {
    onStep('loading')
    const worker = await createReader()
    try {
      onStep('finding')
      const longest = Math.max(bitmap.width, bitmap.height)
      // a photo no bigger than the second size needs no second look
      const sides = FIND_SIDES_PX.filter((side, index) => index === 0 || side < longest)
      const wholeTexts: string[] = []
      for (const side of sides) {
        const found = await findTable(worker, bitmap, side)
        wholeTexts.push(found.text)
        if (!found.region) continue
        onStep('reading')
        const { region } = found
        const size = { width: region.x1 - region.x0, height: region.y1 - region.y0 }
        const scale = enlargement(found.textHeight, size)
        const { data } = await worker.recognize(await toBlob(drawn(bitmap, region, scale, true)))
        return [data.text, ...wholeTexts]
      }
      return wholeTexts
    } finally {
      await worker.terminate()
    }
  } finally {
    bitmap.close()
  }
}
