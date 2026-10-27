import { NUTRITION_FIELDS, type NutritionBasis } from '../nutrition/bases'
import type { Measure } from '../nutrition/types'

/**
 * Notes on gaps in a product's nutrition as Open Food Facts states it (per 100 g, per portion and
 * the portion weight). Nothing is worked out from it: the form gets only the stated values.
 * The values themselves are checked live in the form (see ingredients/valueChecks).
 */

type ReportedNutrition = {
  /** what the amounts below are in (g when left out); per100g is then per 100 ml */
  readonly measure?: Measure
  readonly per100g: NutritionBasis
  readonly perPortion: NutritionBasis
  /** grams in one portion, if known */
  readonly portionG: number | null
  /** grams in the pack, if known */
  readonly packG: number | null
}

const hasAny = (basis: NutritionBasis) => NUTRITION_FIELDS.some((field) => basis[field] !== null)

/** Gaps and contradictions in the product data itself; empty when there are none. */
export function nutritionWarnings(reported: ReportedNutrition): string[] {
  const { per100g, perPortion, portionG, packG, measure = 'g' } = reported
  const warnings: string[] = []
  if (per100g.kcal === null && perPortion.kcal === null) {
    warnings.push('No calories on Open Food Facts.')
  }
  if (portionG !== null && packG !== null && portionG > packG) {
    warnings.push(
      `The portion (${portionG} ${measure}) is bigger than the pack (${packG} ${measure}).`,
    )
  }
  if (portionG === null && hasAny(perPortion)) {
    warnings.push('Values per portion, but the weight per unit is missing.')
  }
  return warnings
}
