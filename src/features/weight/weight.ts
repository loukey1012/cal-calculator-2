import type { Tables } from '../../lib/database.types'
import { parseDecimal, roundTo } from '../../lib/numbers'

/** One weighing; it counts from its day until the next entry. */
export type WeightEntry = { readonly date: string; readonly weightKg: number }

// weight_entries.weight_kg: numeric(4, 1) between 20 and 400
export const MIN_WEIGHT_KG = 20
export const MAX_WEIGHT_KG = 400
const WEIGHT_DECIMALS = 1

export function weightFromRow(
  row: Pick<Tables<'weight_entries'>, 'date' | 'weight_kg'>,
): WeightEntry {
  return { date: row.date, weightKg: row.weight_kg }
}

const byDate = (a: WeightEntry, b: WeightEntry) => a.date.localeCompare(b.date)

/** The weight that applies on `date`: the latest entry on or before it. */
export function weightOn(entries: readonly WeightEntry[], date: string): WeightEntry | null {
  // ISO dates compare correctly as strings
  return (
    entries
      .filter((entry) => entry.date <= date)
      .toSorted(byDate)
      .at(-1) ?? null
  )
}

export function withWeightSaved(
  entries: readonly WeightEntry[],
  saved: WeightEntry,
): WeightEntry[] {
  return [...entries.filter((entry) => entry.date !== saved.date), saved].toSorted(byDate)
}

export function withWeightRemoved(entries: readonly WeightEntry[], date: string): WeightEntry[] {
  return entries.filter((entry) => entry.date !== date)
}

export type ParsedWeight =
  | { readonly ok: true; readonly weightKg: number }
  | { readonly ok: false; readonly message: string }

export function parseWeight(raw: string): ParsedWeight {
  if (raw.trim() === '') return { ok: false, message: 'Enter your weight' }
  const value = parseDecimal(raw)
  if (value === null) return { ok: false, message: 'Enter a number' }
  const weightKg = roundTo(value, WEIGHT_DECIMALS)
  if (weightKg < MIN_WEIGHT_KG || weightKg > MAX_WEIGHT_KG) {
    return { ok: false, message: `Between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG} kg` }
  }
  return { ok: true, weightKg }
}

/** e.g. "72.4 kg"; `locale` defaults to the device language */
export function formatKg(weightKg: number, locale?: string): string {
  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: WEIGHT_DECIMALS,
    maximumFractionDigits: WEIGHT_DECIMALS,
  }).format(weightKg)
  return `${number} kg`
}
