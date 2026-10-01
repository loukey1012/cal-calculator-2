import { roundTo } from '../../lib/numbers'
import type { NutritionTotals } from './types'

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

/** e.g. "P 32.0 g · C 40.0 g · F –" (– when no logged item had a value, rather than a false 0) */
export function macroSummary(totals: NutritionTotals, locale?: string): string {
  const show = (key: 'protein' | 'carbs' | 'fat') =>
    totals[key] === 0 && totals.missing.includes(key)
      ? '–'
      : `${formatGrams(totals[key], locale)} g`
  return `P ${show('protein')} · C ${show('carbs')} · F ${show('fat')}`
}
