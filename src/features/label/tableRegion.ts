/**
 * Finding the nutrition table in a photo of the whole package: the first reading gives every
 * word with its place, the table is where the nutrition words are. That part of the full-size
 * photo is then read on its own, enlarged and with more contrast (see recognize.ts).
 */

export type Box = {
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}
export type Size = { readonly width: number; readonly height: number }
export type PlacedWord = {
  readonly text: string
  readonly bbox: Box
  /** the height of its letters: a word in a table cell can take the cell's borders along */
  readonly letterHeight?: number
}

const NUTRITION_WORD =
  /nahrwert|naehrwert|nutrition|brennwert|energie|energy|kcal|\bkj\b|fett|\bfat\b|saturat|kohlenhydrat|carbohydrat|zucker|sugar|ballaststoff|fibre|fiber|eiwei|protein|salz|salt/
/**
 * The words the table is found by: its header and energy row. Unlike "Zucker" or "Salz" they
 * never stand in an ingredients list, and they come out right even when other rows don't.
 */
const ANCHOR_WORD = /nahrwert|naehrwert|nutrition|brennwert|energie|energy|kcal|\bkj\b/

// how far an anchor may be from the others, in text heights (a stray "Energie" in a slogan)
const MAX_SPREAD_LINES = 12
// room around the table; below its energy row come up to 8 more rows (fat … salt), which can
// be spaced 3 text heights apart
const MARGIN_LINES = 2
const ROWS_BELOW_LINES = 26
// the value columns to the right of the row names: at least this wide
const MIN_COLUMNS_LINES = 10

// the engine reads text best at about this height; never enlarged more than this
// (letter height; measured on a real table: 1–2 times read well, 3 times only its first line)
const TARGET_TEXT_PX = 24
const MAX_ENLARGEMENT = 2.5
// letters of 100 px (a close-up) aren't read at all: made smaller, down to this
const MIN_ENLARGEMENT = 0.4
/** the longest side of what is read: bigger takes long on a phone */
export const MAX_READ_SIDE_PX = 2500

const LUMA = { r: 0.299, g: 0.587, b: 0.114 } as const
const LOW_PERCENTILE = 0.02
const HIGH_PERCENTILE = 0.98
const MAX_CHANNEL = 255

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
}

export function isNutritionWord(text: string): boolean {
  return NUTRITION_WORD.test(normalize(text))
}

const isAnchor = (word: PlacedWord) => ANCHOR_WORD.test(normalize(word.text))

const heightOf = (box: Box) => box.y1 - box.y0
const centerOf = (box: Box) => ({ x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 })

function median(values: readonly number[]): number {
  const sorted = values.toSorted((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

/** The table's anchor words close together, without strays elsewhere (a slogan, the front). */
function anchorsOf(words: readonly PlacedWord[]): PlacedWord[] {
  const anchors = words.filter(isAnchor)
  const lineHeight = median(anchors.map((word) => heightOf(word.bbox)))
  const centers = anchors.map((word) => centerOf(word.bbox))
  const middle = { x: median(centers.map((c) => c.x)), y: median(centers.map((c) => c.y)) }
  const reach = MAX_SPREAD_LINES * lineHeight
  return anchors.filter((word) => {
    const center = centerOf(word.bbox)
    return Math.abs(center.y - middle.y) <= reach && Math.abs(center.x - middle.x) <= reach * 2
  })
}

/** The text height of the table, in photo pixels (from its header and energy row). */
export function textHeight(words: readonly PlacedWord[]): number {
  return median(anchorsOf(words).map((word) => word.letterHeight ?? heightOf(word.bbox)))
}

const inside = (box: Box, zone: Box) => {
  const center = centerOf(box)
  return center.x >= zone.x0 && center.x <= zone.x1 && center.y >= zone.y0 && center.y <= zone.y1
}

/**
 * Where the nutrition table is in the photo, or null without one: from its header and energy
 * row down by the height of a table, widened to the other nutrition words found in there.
 */
export function tableRegion(words: readonly PlacedWord[], photo: Size): Box | null {
  const anchors = anchorsOf(words)
  if (anchors.length === 0) return null
  const line = median(anchors.map((word) => heightOf(word.bbox)))
  const x0 = Math.min(...anchors.map((word) => word.bbox.x0))
  const x1 = Math.max(...anchors.map((word) => word.bbox.x1))
  const zone = {
    x0: x0 - MARGIN_LINES * line,
    y0: Math.min(...anchors.map((word) => word.bbox.y0)) - MARGIN_LINES * line,
    x1: x1 + Math.max(x1 - x0, MIN_COLUMNS_LINES * line),
    y1: Math.max(...anchors.map((word) => word.bbox.y1)) + ROWS_BELOW_LINES * line,
  }
  // row names further left or values further right than the anchors
  const rows = words.filter((word) => isNutritionWord(word.text) && inside(word.bbox, zone))
  return {
    x0: Math.max(0, Math.floor(Math.min(zone.x0, ...rows.map((word) => word.bbox.x0 - line)))),
    y0: Math.max(0, Math.floor(zone.y0)),
    x1: Math.min(photo.width, Math.ceil(Math.max(zone.x1, ...rows.map((word) => word.bbox.x1)))),
    y1: Math.min(photo.height, Math.ceil(zone.y1)),
  }
}

/** How much to scale the cut-out table so its text reads well, within the reading size. */
export function enlargement(textHeightPx: number, region: Size): number {
  const wanted = Math.min(
    MAX_ENLARGEMENT,
    Math.max(MIN_ENLARGEMENT, TARGET_TEXT_PX / Math.max(textHeightPx, 1)),
  )
  return Math.min(wanted, MAX_READ_SIDE_PX / Math.max(region.width, region.height))
}

function percentile(histogram: readonly number[], count: number, share: number): number {
  let seen = 0
  for (const [value, amount] of histogram.entries()) {
    seen += amount
    if (seen >= share * count) return value
  }
  return MAX_CHANNEL
}

/**
 * RGBA pixels made grey, with the contrast stretched (the darkest 2 % black, the lightest 2 %
 * white): print on shiny or colored packaging reads better. A new array; the input stays.
 */
export function enhanceContrast(pixels: Uint8ClampedArray): Uint8ClampedArray<ArrayBuffer> {
  const count = pixels.length / 4
  const greys = new Uint8ClampedArray(count)
  const histogram = Array<number>(MAX_CHANNEL + 1).fill(0)
  for (let index = 0; index < count; index++) {
    const offset = index * 4
    const grey = Math.round(
      LUMA.r * (pixels[offset] ?? 0) +
        LUMA.g * (pixels[offset + 1] ?? 0) +
        LUMA.b * (pixels[offset + 2] ?? 0),
    )
    greys[index] = grey
    histogram[grey] = (histogram[grey] ?? 0) + 1
  }
  const low = percentile(histogram, count, LOW_PERCENTILE)
  const high = percentile(histogram, count, HIGH_PERCENTILE)
  const out = new Uint8ClampedArray(pixels.length)
  for (let index = 0; index < count; index++) {
    const grey = greys[index] ?? 0
    const stretched = high > low ? ((grey - low) * MAX_CHANNEL) / (high - low) : grey
    const offset = index * 4
    out[offset] = stretched
    out[offset + 1] = stretched
    out[offset + 2] = stretched
    out[offset + 3] = pixels[offset + 3] ?? MAX_CHANNEL
  }
  return out
}
