import type { AmountUnit, Measure } from './types'

/**
 * An ingredient's measure. Ingredients cached on the phone before measures existed have none:
 * they are grams (the database's default). Never bump the cache buster for it: queued offline
 * changes would be lost.
 */
export function measureOf(ingredient: { readonly measure?: Measure | null }): Measure {
  return ingredient.measure ?? 'g'
}

const MEASURE_NAMES = { g: 'Grams', ml: 'Millilitres' } as const

/** "per 100 g" or "per 100 ml" */
export function per100Name(measure: Measure): string {
  return `per 100 ${measure}`
}

/** "grams" or "millilitres", e.g. in "the grams per unit" */
export function measureName(measure: Measure): string {
  return MEASURE_NAMES[measure].toLowerCase()
}

// a unit name like "1 Packung" or "3 Stück" already says how much one unit is
const STARTS_WITH_AMOUNT = /^\s*\d/

/**
 * The unit after an amount: "g", "ml", the ingredient's unit name ("bar"), else "units". A unit
 * name that starts with an amount is counted with a ×, so 1 unit reads "1 × 1 Packung".
 */
export function amountSuffix(unit: AmountUnit, unitLabel?: string | null): string {
  if (unit !== 'unit') return unit
  const name = unitLabel ?? 'units'
  return STARTS_WITH_AMOUNT.test(name) ? `× ${name}` : name
}

/** The unit to choose in an amount editor: "Grams", "Millilitres", or the unit name. */
export function unitChoiceLabel(unit: AmountUnit, unitLabel?: string | null): string {
  return unit === 'unit' ? (unitLabel ?? 'Units') : MEASURE_NAMES[unit]
}
