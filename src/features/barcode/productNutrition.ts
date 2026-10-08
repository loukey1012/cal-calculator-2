import { NUTRIENT_KEYS, type NutrientKey } from '../nutrition/types'

/**
 * A product's nutrition per 100 g and per portion, as Open Food Facts states it, each filled in
 * from the other with the portion weight where missing, plus checks for values that look wrong.
 */

export type NutritionField = 'kcal' | NutrientKey
export type NutritionBasis = Readonly<Record<NutritionField, number | null>>

export const NUTRITION_FIELDS: readonly NutritionField[] = ['kcal', ...NUTRIENT_KEYS]
const GRAMS_BASIS = 100
const MAX_KCAL_PER_100G = 900
// kcal per gram (EU labels: carbs exclude fiber)
const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9, fiber: 2 } as const
// labels round, and sugar alcohols count less than carbs: only clear gaps are reported
const KCAL_TOLERANCE_SHARE = 0.2
const KCAL_TOLERANCE_ABS = 25
const PORTION_TOLERANCE_SHARE = 0.1
const PORTION_TOLERANCE_ABS = 5

export type ReportedNutrition = {
  readonly per100g: NutritionBasis
  readonly perPortion: NutritionBasis
  /** grams in one portion, if known */
  readonly portionG: number | null
  /** grams in the pack, if known */
  readonly packG: number | null
}

export type ResolvedNutrition = {
  readonly per100g: NutritionBasis
  readonly perPortion: NutritionBasis
}

function mapBasis(pick: (field: NutritionField) => number | null): NutritionBasis {
  return Object.fromEntries(NUTRITION_FIELDS.map((field) => [field, pick(field)])) as Record<
    NutritionField,
    number | null
  >
}

/** Stated values win; a missing one is worked out from the other basis when the weight is known. */
function filledIn(stated: NutritionBasis, other: NutritionBasis, factor: number | null) {
  return mapBasis((field) => {
    const own = stated[field]
    if (own !== null) return own
    const source = other[field]
    return source === null || factor === null ? null : source * factor
  })
}

export function resolveNutrition(reported: ReportedNutrition): ResolvedNutrition {
  const { portionG } = reported
  return {
    per100g: filledIn(
      reported.per100g,
      reported.perPortion,
      portionG ? GRAMS_BASIS / portionG : null,
    ),
    perPortion: filledIn(
      reported.perPortion,
      reported.per100g,
      portionG ? portionG / GRAMS_BASIS : null,
    ),
  }
}

const hasAny = (basis: NutritionBasis) => NUTRITION_FIELDS.some((field) => basis[field] !== null)

function differs(actual: number, expected: number, share: number, absolute: number): boolean {
  const gap = Math.abs(actual - expected)
  return gap > absolute && gap > expected * share
}

function portionChecks({ per100g, perPortion, portionG, packG }: ReportedNutrition): string[] {
  const warnings: string[] = []
  if (portionG !== null && packG !== null && portionG > packG) {
    warnings.push(`The portion (${portionG} g) is bigger than the pack (${packG} g).`)
  }
  if (portionG === null && hasAny(perPortion)) {
    warnings.push('Values per portion, but no portion weight: per 100 g couldn’t be worked out.')
  }
  const mismatch =
    portionG !== null &&
    NUTRITION_FIELDS.some((field) => {
      const stated = perPortion[field]
      const base = per100g[field]
      if (stated === null || base === null) return false
      const expected = (base * portionG) / GRAMS_BASIS
      return differs(
        stated,
        expected,
        PORTION_TOLERANCE_SHARE,
        field === 'kcal' ? PORTION_TOLERANCE_ABS : 1,
      )
    })
  if (mismatch) {
    warnings.push(
      'The values per portion don’t match the values per 100 g: check the portion size.',
    )
  }
  return warnings
}

function per100gChecks({ kcal, protein, carbs, sugar, fat, sat_fat, fiber, salt }: NutritionBasis) {
  const warnings: string[] = []
  if (kcal !== null && kcal > MAX_KCAL_PER_100G) {
    warnings.push(`More than ${MAX_KCAL_PER_100G} kcal per 100 g isn’t possible.`)
  }
  const grams = [protein, carbs, fat, fiber, salt].reduce<number>(
    (sum, value) => sum + (value ?? 0),
    0,
  )
  if (grams > GRAMS_BASIS) warnings.push('The nutrients add up to more than 100 g per 100 g.')
  if (sugar !== null && carbs !== null && sugar > carbs) {
    warnings.push('More sugar than carbs per 100 g.')
  }
  if (sat_fat !== null && fat !== null && sat_fat > fat) {
    warnings.push('More saturated fat than fat per 100 g.')
  }
  const macros = [protein, carbs, fat]
  if (kcal !== null && macros.every((value) => value !== null)) {
    const expected =
      (protein ?? 0) * KCAL_PER_G.protein +
      (carbs ?? 0) * KCAL_PER_G.carbs +
      (fat ?? 0) * KCAL_PER_G.fat +
      (fiber ?? 0) * KCAL_PER_G.fiber
    if (differs(kcal, expected, KCAL_TOLERANCE_SHARE, KCAL_TOLERANCE_ABS)) {
      warnings.push(
        `Calories don’t fit protein, carbs and fat (about ${Math.round(expected)} kcal per 100 g expected).`,
      )
    }
  }
  return warnings
}

/** Things worth checking against the package before saving; empty when it all fits. */
export function nutritionWarnings(reported: ReportedNutrition): string[] {
  const { per100g, perPortion } = resolveNutrition(reported)
  const noCalories = per100g.kcal === null && perPortion.kcal === null
  return [
    ...(noCalories ? ['No calories on Open Food Facts.'] : []),
    ...portionChecks(reported),
    ...per100gChecks(per100g),
  ]
}
