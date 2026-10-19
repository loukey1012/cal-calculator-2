import { roundTo } from '../../lib/numbers'
import type { Measure, NutrientKey } from '../nutrition/types'

/**
 * Reads the per-100 g (or ml) values from the text recognised in a photo of a nutrition table,
 * German or English. It takes the first value of each row: on EU labels that column is per
 * 100 g, before per portion and the reference intake. Unknown values stay null.
 */

export type LabelValues = { readonly kcal: number | null } & Readonly<
  Record<NutrientKey, number | null>
>

export type LabelReading = {
  /** "per 100 ml" on the label makes it a drink */
  readonly measure: Measure
  readonly values: LabelValues
  /** how many values were read */
  readonly found: number
}

type Field = keyof LabelValues

// checked in this order: "gesättigte Fettsäuren" before "Fett", "davon Zucker" before carbs
const ROWS: ReadonlyArray<readonly [Field, RegExp]> = [
  ['sat_fat', /gesatt|saturat/],
  ['sugar', /zucker|sugar/],
  ['fat', /\bfett\b|\bfat\b/],
  ['carbs', /kohlenhydrat|carbohydrat/],
  ['fiber', /ballaststoff|fibre|fiber/],
  ['protein', /eiwei|protein/],
  ['salt', /\bsalz\b|\bsalt\b/],
  ['kcal', /brennwert|energie|energy/],
]

const KJ_PER_KCAL = 4.184
const MG_PER_G = 1000
const GRAM_DECIMALS = 2
// grams of a nutrient in 100 g can't be more: a bigger number has a misread unit in it
const MAX_GRAMS = 100

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`
// the row's first number (its first column: per 100 g), with its unit if it has one
const FIRST_AMOUNT = new RegExp(String.raw`${NUMBER}\s*(mg|g)?\b`)
const KCAL = new RegExp(String.raw`${NUMBER}\s*kcal`)
const KJ = new RegExp(String.raw`${NUMBER}\s*kj`)
// "1.520 kJ": a dot or comma before exactly three digits separates thousands
const THOUSANDS = /^\d{1,3}[.,]\d{3}$/

/** Lowercase, without accents (ä → a, ß → ss), single spaces. */
function normalize(line: string): string {
  return line
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const decimal = (text: string) => Number(text.replace(',', '.'))

/** kcal as printed; only without them worked out from kJ (also over the row's lines) */
function energyIn(lines: readonly string[]): number | null {
  for (const line of lines) {
    const kcal = KCAL.exec(line)
    if (kcal?.[1]) return Math.round(wholeNumber(kcal[1]))
  }
  for (const line of lines) {
    const kj = KJ.exec(line)
    if (kj?.[1]) return Math.round(wholeNumber(kj[1]) / KJ_PER_KCAL)
  }
  return null
}

function wholeNumber(text: string): number {
  return THOUSANDS.test(text) ? Number(text.replace(/[.,]/, '')) : decimal(text)
}

/**
 * Text recognition often reads the unit "g" as a 9: "9,8 g" becomes "9,89", "58 g" "589g". A
 * trailing 9 is dropped when the unit is missing or the value can't be per 100 g.
 */
function withoutMisreadUnit(number: string, unit: string | undefined): string {
  if (!/\d9$/.test(number)) return number
  return unit === undefined || decimal(number) > MAX_GRAMS ? number.slice(0, -1) : number
}

function gramsIn(line: string): number | null {
  const amount = FIRST_AMOUNT.exec(line)
  const number = amount?.[1]
  if (!number) return null
  const unit = amount[2]
  const value = decimal(withoutMisreadUnit(number, unit))
  return roundTo(unit === 'mg' ? value / MG_PER_G : value, GRAM_DECIMALS)
}

function fieldOf(line: string, found: ReadonlySet<Field>): Field | null {
  return ROWS.find(([field, pattern]) => !found.has(field) && pattern.test(line))?.[0] ?? null
}

/** The row's line and up to two lines after it, until the next row (a name alone on its line). */
function rowLines(lines: readonly string[], index: number): string[] {
  const after = lines.slice(index + 1, index + 3)
  const nextRow = after.findIndex((line) => ROWS.some(([, pattern]) => pattern.test(line)))
  return [lines[index] ?? '', ...(nextRow === -1 ? after : after.slice(0, nextRow))]
}

/** The row's value, also from the lines after its name. */
function readRow(field: Field, lines: readonly string[], index: number): number | null {
  const own = rowLines(lines, index)
  if (field === 'kcal') return energyIn(own)
  return own.map(gramsIn).find((value) => value !== null) ?? null
}

const EMPTY: LabelValues = {
  kcal: null,
  fat: null,
  sat_fat: null,
  carbs: null,
  sugar: null,
  fiber: null,
  protein: null,
  salt: null,
}

export function parseNutritionLabel(text: string): LabelReading {
  const lines = text.split(/\r?\n/).map(normalize).filter(Boolean)
  const values = lines.reduce<Partial<Record<Field, number>>>((read, line, index) => {
    const field = fieldOf(line, new Set(Object.keys(read) as Field[]))
    if (field === null) return read
    const value = readRow(field, lines, index)
    return value === null ? read : { ...read, [field]: value }
  }, {})
  return {
    measure: /100\s*ml/.test(lines.join(' ')) ? 'ml' : 'g',
    values: { ...EMPTY, ...values },
    found: Object.keys(values).length,
  }
}
