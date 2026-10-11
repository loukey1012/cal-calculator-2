import type { AmountUnit, Measure } from './types'

const MEASURE_NAMES = { g: 'Grams', ml: 'Millilitres' } as const

/** "per 100 g" or "per 100 ml" */
export function per100Name(measure: Measure): string {
  return `per 100 ${measure}`
}

/** "grams" or "millilitres", e.g. in "the grams per unit" */
export function measureName(measure: Measure): string {
  return MEASURE_NAMES[measure].toLowerCase()
}

/** The unit after an amount: "g", "ml", or the ingredient's unit name ("bar"), else "units". */
export function amountSuffix(unit: AmountUnit, unitLabel?: string | null): string {
  return unit === 'unit' ? (unitLabel ?? 'units') : unit
}

/** The unit to choose in an amount editor: "Grams", "Millilitres", or the unit name. */
export function unitChoiceLabel(unit: AmountUnit, unitLabel?: string | null): string {
  return unit === 'unit' ? (unitLabel ?? 'Units') : MEASURE_NAMES[unit]
}
