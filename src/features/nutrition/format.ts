import { roundTo } from '../../lib/numbers'

// sums like 3 × 0.1 × 100 give 30.000000000000004; strip that before rounding up
const FLOAT_NOISE_DECIMALS = 6
const NUTRIENT_DECIMALS = 1

/** Calories are always whole numbers, rounded up. */
export function toWholeKcal(value: number): number {
  return Math.ceil(roundTo(value, FLOAT_NOISE_DECIMALS))
}

/** `locale` defaults to the device language, e.g. "2.000" on a German iPhone. */
export function formatKcal(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(toWholeKcal(value))
}

export function formatGrams(value: number, locale?: string): string {
  const rounded = roundTo(value, NUTRIENT_DECIMALS)
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: NUTRIENT_DECIMALS,
    maximumFractionDigits: NUTRIENT_DECIMALS,
  }).format(rounded === 0 ? 0 : rounded) // `=== 0` is also true for -0
}
