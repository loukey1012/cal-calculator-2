import { parseDecimal } from '../../lib/numbers'
import { formatKcal, toWholeKcal } from '../nutrition/format'

// profiles.kcal_burned: integer > 0
const MAX_KCAL = 99_999

type KcalBurnedResult =
  | { readonly success: true; readonly value: number | null }
  | { readonly success: false; readonly message: string }

/** The "Calories burned per day" field: empty = not set, otherwise whole calories above 0. */
export function parseKcalBurned(raw: string): KcalBurnedResult {
  if (raw.trim() === '') return { success: true, value: null }
  const value = parseDecimal(raw)
  if (value === null) return { success: false, message: 'Enter a number' }
  if (value <= 0) return { success: false, message: 'Must be more than 0' }
  if (value > MAX_KCAL) return { success: false, message: 'Too large' }
  return { success: true, value: toWholeKcal(value) }
}

export function describeKcalBurned(kcalBurned: number | null): string {
  return kcalBurned == null ? 'Not set' : `${formatKcal(kcalBurned)} kcal`
}
