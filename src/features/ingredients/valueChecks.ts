import { parseDecimal } from '../../lib/numbers'
import { macroKcal, mapBasis, NUTRITION_FIELDS, type NutritionBasis } from '../nutrition/bases'
import type { Measure } from '../nutrition/types'
import { measureName, per100Name } from '../nutrition/unitNames'
import type { BasisKey, IngredientFormValues } from './ingredientForm'

/**
 * Values in the ingredient form that look wrong (typos, odd product data), checked on every
 * change. Nothing here blocks saving: some real products are odd.
 */

const GRAMS_BASIS = 100
const MAX_KCAL_PER_100G = 900
// labels round, and sugar alcohols count less than carbs: only clear gaps are reported
const KCAL_TOLERANCE_SHARE = 0.2
const KCAL_TOLERANCE_ABS = 25
const UNIT_TOLERANCE_SHARE = 0.1
const UNIT_TOLERANCE_KCAL = 5
const UNIT_TOLERANCE_GRAMS = 1

export type ValueWarning = {
  readonly text: string
  /** the form fields to look at, keyed like the form's errors, e.g. "per100g.sugar" */
  readonly fields: readonly string[]
}

const basisName = (basis: BasisKey, measure: Measure) =>
  basis === 'per100g' ? per100Name(measure) : 'per unit'

function differs(actual: number, expected: number, share: number, absolute: number): boolean {
  const gap = Math.abs(actual - expected)
  return gap > absolute && gap > expected * share
}

function numbersOf(values: IngredientFormValues, basis: BasisKey): NutritionBasis | null {
  const enabled = basis === 'per100g' ? values.per100gEnabled : values.perUnitEnabled
  return enabled ? mapBasis((field) => parseDecimal(values[basis][field])) : null
}

/** Checks that hold for any amount: per 100 g (or ml) and per unit alike. */
function basisChecks(basis: BasisKey, numbers: NutritionBasis, measure: Measure): ValueWarning[] {
  const { kcal, carbs, sugar, fat, sat_fat } = numbers
  const name = basisName(basis, measure)
  const warnings: ValueWarning[] = []
  if (sugar !== null && carbs !== null && sugar > carbs) {
    warnings.push({ text: `More sugar than carbs ${name}.`, fields: [`${basis}.sugar`] })
  }
  if (sat_fat !== null && fat !== null && sat_fat > fat) {
    warnings.push({ text: `More saturated fat than fat ${name}.`, fields: [`${basis}.sat_fat`] })
  }
  const expected = macroKcal(numbers)
  if (
    kcal !== null &&
    expected !== null &&
    differs(kcal, expected, KCAL_TOLERANCE_SHARE, KCAL_TOLERANCE_ABS)
  ) {
    warnings.push({
      text: `Calories don’t fit protein, carbs and fat (about ${Math.round(expected)} kcal ${name} expected).`,
      fields: [`${basis}.kcal`],
    })
  }
  return warnings
}

/** Pure fat has 900 kcal per 100 g; 100 ml of oil less. 100 ml of honey can hold over 100 g. */
function per100gLimits(numbers: NutritionBasis, measure: Measure): ValueWarning[] {
  const warnings: ValueWarning[] = []
  if (numbers.kcal !== null && numbers.kcal > MAX_KCAL_PER_100G) {
    warnings.push({
      text: `More than ${MAX_KCAL_PER_100G} kcal ${per100Name(measure)} isn’t possible.`,
      fields: ['per100g.kcal'],
    })
  }
  if (measure === 'ml') return warnings
  const parts = (['protein', 'carbs', 'fat', 'fiber', 'salt'] as const).filter(
    (field) => numbers[field] !== null,
  )
  const grams = parts.reduce((sum, field) => sum + (numbers[field] ?? 0), 0)
  if (grams > GRAMS_BASIS) {
    warnings.push({
      text: 'The nutrients add up to more than 100 g per 100 g.',
      fields: parts.map((field) => `per100g.${field}`),
    })
  }
  return warnings
}

const hasAnyValue = (basis: NutritionBasis | null) =>
  basis !== null && NUTRITION_FIELDS.some((field) => basis[field] !== null)

/** A weight per unit and values per unit belong together; either alone can be filled from the other. */
function unitPairCheck(
  perUnit: NutritionBasis | null,
  weightText: string,
  measure: Measure,
): ValueWarning[] {
  const weight = parseDecimal(weightText)
  const hasWeight = weight !== null && weight > 0
  const noun = measure === 'ml' ? 'volume' : 'weight'
  if (hasWeight && !hasAnyValue(perUnit)) {
    return [
      {
        text: `A ${noun} per unit, but no values per unit. With values per 100 g, Calculate missing values fills them in.`,
        fields: ['unitWeightG'],
      },
    ]
  }
  if (!hasWeight && hasAnyValue(perUnit)) {
    return [
      {
        text: `Values per unit, but no ${noun} per unit. With calories per 100 g, Calculate missing values works it out.`,
        fields: ['unitWeightG'],
      },
    ]
  }
  return []
}

/** Per unit should be per 100 g scaled by the grams per unit (or ml). */
function unitWeightCheck(
  per100g: NutritionBasis | null,
  perUnit: NutritionBasis | null,
  weightText: string,
  measure: Measure,
): ValueWarning[] {
  const weight = parseDecimal(weightText)
  if (!per100g || !perUnit || weight === null || weight <= 0) return []
  const mismatch = NUTRITION_FIELDS.some((field) => {
    const stated = perUnit[field]
    const base = per100g[field]
    if (stated === null || base === null) return false
    const tolerance = field === 'kcal' ? UNIT_TOLERANCE_KCAL : UNIT_TOLERANCE_GRAMS
    return differs(stated, (base * weight) / GRAMS_BASIS, UNIT_TOLERANCE_SHARE, tolerance)
  })
  if (!mismatch) return []
  return [
    {
      text: `The values per unit don’t match the values ${per100Name(measure)}: check the ${measureName(measure)} per unit.`,
      fields: ['unitWeightG'],
    },
  ]
}

/** Things worth checking against the package before saving; empty when it all fits. */
export function valueWarnings(values: IngredientFormValues): readonly ValueWarning[] {
  const per100g = numbersOf(values, 'per100g')
  const perUnit = numbersOf(values, 'perUnit')
  const { measure } = values
  return [
    ...(per100g
      ? [...per100gLimits(per100g, measure), ...basisChecks('per100g', per100g, measure)]
      : []),
    ...(perUnit ? basisChecks('perUnit', perUnit, measure) : []),
    ...unitPairCheck(perUnit, values.unitWeightG, measure),
    ...unitWeightCheck(per100g, perUnit, values.unitWeightG, measure),
  ]
}

/** The fields any warning points at. */
export function flaggedFields(warnings: readonly ValueWarning[]): ReadonlySet<string> {
  return new Set(warnings.flatMap((warning) => warning.fields))
}
