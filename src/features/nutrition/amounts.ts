import { roundTo } from '../../lib/numbers'
import type { AmountUnit, IngredientNutrition, NutritionBasis, NutritionValues } from './types'

const GRAMS_PER_BASIS = 100
// matches meal_items.basis_multiplier numeric(10, 4)
const MULTIPLIER_DECIMALS = 4
const UNIT_ORDER: readonly AmountUnit[] = ['g', 'unit']
const UNIT_NAMES: Record<AmountUnit, string> = { g: 'grams', unit: 'units' }

export type ResolvedAmount = {
  readonly basis: NutritionBasis
  /** How many bases the amount is: 150 g on per_100g → 1.5, 2 bars on per_unit → 2. */
  readonly multiplier: number
  readonly values: NutritionValues
}

type BasisChoice = {
  readonly basis: NutritionBasis
  readonly values: NutritionValues
  readonly multiplierFor: (amount: number) => number
}

/** Prefers the basis matching the entered unit; falls back to converting via the unit weight. */
function chooseBasis(
  { per100g, perUnit, unitWeightG }: IngredientNutrition,
  unit: AmountUnit,
): BasisChoice | null {
  if (unit === 'g') {
    if (per100g) {
      return { basis: 'per_100g', values: per100g, multiplierFor: (g) => g / GRAMS_PER_BASIS }
    }
    if (perUnit && unitWeightG) {
      return { basis: 'per_unit', values: perUnit, multiplierFor: (g) => g / unitWeightG }
    }
    return null
  }
  if (perUnit) return { basis: 'per_unit', values: perUnit, multiplierFor: (units) => units }
  if (per100g && unitWeightG) {
    return {
      basis: 'per_100g',
      values: per100g,
      multiplierFor: (units) => (units * unitWeightG) / GRAMS_PER_BASIS,
    }
  }
  return null
}

export function availableUnits(nutrition: IngredientNutrition): readonly AmountUnit[] {
  return UNIT_ORDER.filter((unit) => chooseBasis(nutrition, unit) !== null)
}

export function resolveAmount(
  nutrition: IngredientNutrition,
  amount: number,
  unit: AmountUnit,
): ResolvedAmount {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RangeError('Amount must be a positive number')
  }
  const choice = chooseBasis(nutrition, unit)
  if (!choice) throw new Error(`This ingredient can't be measured in ${UNIT_NAMES[unit]}`)

  const multiplier = roundTo(choice.multiplierFor(amount), MULTIPLIER_DECIMALS)
  if (multiplier <= 0) throw new RangeError('Amount is too small to log')
  return { basis: choice.basis, multiplier, values: choice.values }
}
