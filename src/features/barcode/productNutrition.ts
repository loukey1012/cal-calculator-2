import { completeBases, NUTRITION_FIELDS, type NutritionBasis } from '../nutrition/bases'
import type { Measure } from '../nutrition/types'

/**
 * A product's nutrition per 100 g and per portion, as Open Food Facts states it, each filled in
 * from the other with the portion weight where missing, plus notes on gaps in the product data.
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

type ResolvedNutrition = {
  readonly per100g: NutritionBasis
  readonly perPortion: NutritionBasis
}

export function resolveNutrition(reported: ReportedNutrition): ResolvedNutrition {
  const { per100g, perUnit } = completeBases(
    reported.per100g,
    reported.perPortion,
    reported.portionG,
  )
  return { per100g, perPortion: perUnit }
}

const hasAny = (basis: NutritionBasis) => NUTRITION_FIELDS.some((field) => basis[field] !== null)

/** Gaps and contradictions in the product data itself; empty when there are none. */
export function nutritionWarnings(reported: ReportedNutrition): string[] {
  const { per100g, perPortion } = resolveNutrition(reported)
  const { portionG, packG, measure = 'g' } = reported
  const warnings: string[] = []
  if (per100g.kcal === null && perPortion.kcal === null) {
    warnings.push('No calories on Open Food Facts.')
  }
  if (portionG !== null && packG !== null && portionG > packG) {
    warnings.push(
      `The portion (${portionG} ${measure}) is bigger than the pack (${packG} ${measure}).`,
    )
  }
  if (portionG === null && hasAny(reported.perPortion)) {
    warnings.push('Values per portion, but no portion weight: per 100 g couldn’t be worked out.')
  }
  return warnings
}
