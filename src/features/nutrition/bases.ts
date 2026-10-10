import { NUTRIENT_KEYS, type NutrientKey } from './types'

/**
 * Values per 100 g and per unit (e.g. a portion or a bar) work out from each other with the
 * unit's weight. Used for scanned products and the ingredient form's "Calculate" button.
 */

export type NutritionField = 'kcal' | NutrientKey
/** null = unknown */
export type NutritionBasis = Readonly<Record<NutritionField, number | null>>

export const NUTRITION_FIELDS: readonly NutritionField[] = ['kcal', ...NUTRIENT_KEYS]
const GRAMS_BASIS = 100

export function mapBasis(pick: (field: NutritionField) => number | null): NutritionBasis {
  return Object.fromEntries(NUTRITION_FIELDS.map((field) => [field, pick(field)])) as Record<
    NutritionField,
    number | null
  >
}

export const EMPTY_BASIS: NutritionBasis = mapBasis(() => null)

/** Known values stay; a missing one is worked out from the other basis when the weight is known. */
function filledIn(known: NutritionBasis, other: NutritionBasis, factor: number | null) {
  return mapBasis((field) => {
    const own = known[field]
    if (own !== null) return own
    const source = other[field]
    return source === null || factor === null ? null : source * factor
  })
}

export type BothBases = { readonly per100g: NutritionBasis; readonly perUnit: NutritionBasis }

/** Each basis completed from the other; without a weight (null or ≤ 0) nothing is worked out. */
export function completeBases(
  per100g: NutritionBasis,
  perUnit: NutritionBasis,
  unitG: number | null,
): BothBases {
  const weight = unitG !== null && unitG > 0 ? unitG : null
  return {
    per100g: filledIn(per100g, perUnit, weight === null ? null : GRAMS_BASIS / weight),
    perUnit: filledIn(perUnit, per100g, weight === null ? null : weight / GRAMS_BASIS),
  }
}

// kcal per gram (EU labels: carbs exclude fiber)
const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9, fiber: 2 } as const

/** Calories from protein, carbs and fat (plus fiber when known); null without all three. */
export function macroKcal({ protein, carbs, fat, fiber }: NutritionBasis): number | null {
  if (protein === null || carbs === null || fat === null) return null
  return (
    protein * KCAL_PER_G.protein +
    carbs * KCAL_PER_G.carbs +
    fat * KCAL_PER_G.fat +
    (fiber ?? 0) * KCAL_PER_G.fiber
  )
}
