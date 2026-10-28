import { toWholeKcal } from '../../../supabase/functions/_shared/calorieGoal'
import { roundTo } from '../../lib/numbers'
import type { NutritionTotals } from './types'

const NUTRIENT_DECIMALS = 1

export { toWholeKcal }

/** `locale` defaults to the device language, e.g. "2.000" on a German iPhone. */
export function formatKcal(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(toWholeKcal(value))
}

/** e.g. "~650" when some of the calories are an estimate, otherwise "650" */
export function formatKcalTotal(
  totals: Pick<NutritionTotals, 'kcal' | 'estimated'>,
  locale?: string,
): string {
  return `${totals.estimated ? '~' : ''}${formatKcal(totals.kcal, locale)}`
}

export function formatGrams(value: number, locale?: string): string {
  const rounded = roundTo(value, NUTRIENT_DECIMALS)
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: NUTRIENT_DECIMALS,
    maximumFractionDigits: NUTRIENT_DECIMALS,
  }).format(rounded === 0 ? 0 : rounded) // `=== 0` is also true for -0
}

/** In label order, e.g. "F – · C 40.0 g · P 32.0 g" (– when no logged item had a value, rather than a false 0) */
export function macroSummary(totals: NutritionTotals, locale?: string): string {
  const show = (key: 'protein' | 'carbs' | 'fat') =>
    totals[key] === 0 && totals.missing.includes(key)
      ? '–'
      : `${formatGrams(totals[key], locale)} g`
  // label order: fat, carbs, protein
  return `F ${show('fat')} · C ${show('carbs')} · P ${show('protein')}`
}
