import { parseDecimal, roundTo } from '../../lib/numbers'
import {
  completeBases,
  macroKcal,
  mapBasis,
  NUTRITION_FIELDS,
  type NutritionBasis,
  type NutritionField,
} from '../nutrition/bases'
import {
  EMPTY_BASIS,
  type BasisFormValues,
  type BasisKey,
  type IngredientFormValues,
} from './ingredientForm'

/**
 * Changes the ingredient form's buttons make to its values: clearing, splitting a portion into
 * units, "Calculate missing values" and filling in from another source. Each returns new values.
 */

const CALCULATED_DECIMALS = 2
const GRAMS_BASIS = 100

const ENABLED_KEY = { per100g: 'per100gEnabled', perUnit: 'perUnitEnabled' } as const

const isEmpty = (text: string) => text.trim() === ''

/** A worked-out value as the form shows it: whole calories, nutrients to 2 decimals. */
function calculatedText(field: NutritionField, value: number): string {
  return field === 'kcal' ? String(Math.round(value)) : String(roundTo(value, CALCULATED_DECIMALS))
}

/** The numbers of a switched-on section; a switched-off one counts as empty. */
function basisNumbers(enabled: boolean, basis: BasisFormValues): NutritionBasis {
  return mapBasis((field) => (enabled ? parseDecimal(basis[field]) : null))
}

function sectionNumbers(values: IngredientFormValues, basis: BasisKey): NutritionBasis {
  return basisNumbers(values[ENABLED_KEY[basis]], values[basis])
}

// ─── clearing ────────────────────────────────────────────────────────────────────────────────

/** How many values a section has; a switched-off section has none. */
export function filledCount(values: IngredientFormValues, basis: BasisKey): number {
  if (!values[ENABLED_KEY[basis]]) return 0
  return NUTRITION_FIELDS.filter((field) => !isEmpty(values[basis][field])).length
}

export function clearBasisField(
  values: IngredientFormValues,
  basis: BasisKey,
  field: NutritionField,
): IngredientFormValues {
  return { ...values, [basis]: { ...values[basis], [field]: '' } }
}

/** Empties a section; it stays switched on, so the right values can be typed in. */
export function clearBasis(values: IngredientFormValues, basis: BasisKey): IngredientFormValues {
  return { ...values, [basis]: EMPTY_BASIS }
}

// ─── a package portion split into units ──────────────────────────────────────────────────────

/** Whether `parts` can split a portion: a number above 0 other than 1. */
export function isSplitCount(parts: number | null): parts is number {
  return parts !== null && Number.isFinite(parts) && parts > 0 && parts !== 1
}

/**
 * One unit is a part of the stated portion, e.g. a portion of 3 biscuits: every value per unit
 * and the grams per unit are divided by 3. Per 100 g stays as it is.
 */
export function splitPerUnit(values: IngredientFormValues, parts: number): IngredientFormValues {
  if (!isSplitCount(parts)) return values
  const perUnit = Object.fromEntries(
    NUTRITION_FIELDS.map((field) => {
      const value = parseDecimal(values.perUnit[field])
      return [field, value === null ? values.perUnit[field] : calculatedText(field, value / parts)]
    }),
  ) as BasisFormValues
  const weight = parseDecimal(values.unitWeightG)
  return {
    ...values,
    perUnit,
    unitWeightG:
      weight === null ? values.unitWeightG : String(roundTo(weight / parts, CALCULATED_DECIMALS)),
  }
}

// a portion given as a weight or volume, not a number of pieces
const MEASURE_UNITS = new Set([
  'g',
  'gr',
  'gram',
  'grams',
  'gramm',
  'kg',
  'mg',
  'ml',
  'l',
  'cl',
  'dl',
  'oz',
])

/** The number of units in a package portion such as "3 Kekse (30 g)"; null for "30 g". */
export function portionCount(portionText: string | null | undefined): number | null {
  const match = /^\s*(\d+(?:[.,]\d+)?)\s*([^\d\s(][^\s(]*)?/.exec(portionText ?? '')
  if (!match?.[1]) return null
  const unit = (match[2] ?? '').toLowerCase()
  if (unit === '' || MEASURE_UNITS.has(unit)) return null
  const count = Number(match[1].replace(',', '.'))
  return count > 1 ? count : null
}

// ─── "Calculate missing values" ──────────────────────────────────────────────────────────────

export type MissingValuesResult =
  | {
      readonly kind: 'filled'
      readonly values: IngredientFormValues
      readonly count: number
      /** calories were worked out from protein, carbs and fat: the values are now an estimate */
      readonly kcalFromMacros: boolean
    }
  /** no empty field can be worked out */
  | { readonly kind: 'nothing' }
  | { readonly kind: 'needsWeight' }

type Step = { readonly values: IngredientFormValues; readonly count: number }

/** Empty calories of a switched-on section from its protein, carbs and fat. */
function withMacroKcal(values: IngredientFormValues): Step {
  const filled = (['per100g', 'perUnit'] as const).filter(
    (basis) =>
      values[ENABLED_KEY[basis]] &&
      isEmpty(values[basis].kcal) &&
      macroKcal(sectionNumbers(values, basis)) !== null,
  )
  const next = filled.reduce<IngredientFormValues>((current, basis) => {
    const kcal = macroKcal(sectionNumbers(current, basis)) ?? 0
    return { ...current, [basis]: { ...current[basis], kcal: calculatedText('kcal', kcal) } }
  }, values)
  return { values: next, count: filled.length }
}

/** An empty grams per unit from the calories per 100 g and per unit. */
function withDerivedWeight(values: IngredientFormValues): Step {
  if (!isEmpty(values.unitWeightG)) return { values, count: 0 }
  const per100g = sectionNumbers(values, 'per100g').kcal
  const perUnit = sectionNumbers(values, 'perUnit').kcal
  if (per100g === null || perUnit === null || per100g <= 0 || perUnit <= 0) {
    return { values, count: 0 }
  }
  const weight = roundTo((perUnit / per100g) * GRAMS_BASIS, CALCULATED_DECIMALS)
  return { values: { ...values, unitWeightG: String(weight) }, count: 1 }
}

/** Fills only empty fields, so nothing typed is ever replaced. */
function withCalculated(basis: BasisFormValues, calculated: NutritionBasis) {
  const filled = NUTRITION_FIELDS.filter(
    (field) => isEmpty(basis[field]) && calculated[field] !== null,
  )
  const next = Object.fromEntries(
    NUTRITION_FIELDS.map((field) => {
      const value = calculated[field]
      return [
        field,
        filled.includes(field) && value !== null ? calculatedText(field, value) : basis[field],
      ]
    }),
  ) as BasisFormValues
  return { basis: next, count: filled.length }
}

/** Each section's empty values from the other one and the grams per unit. */
function withConverted(values: IngredientFormValues, weight: number): Step {
  const complete = completeBases(
    sectionNumbers(values, 'per100g'),
    sectionNumbers(values, 'perUnit'),
    weight,
  )
  // a switched-off section's leftover text doesn't block filling it
  const per100g = withCalculated(
    values.per100gEnabled ? values.per100g : EMPTY_BASIS,
    complete.per100g,
  )
  const perUnit = withCalculated(
    values.perUnitEnabled ? values.perUnit : EMPTY_BASIS,
    complete.perUnit,
  )
  return {
    count: per100g.count + perUnit.count,
    values: {
      ...values,
      per100gEnabled: values.per100gEnabled || per100g.count > 0,
      per100g: per100g.count > 0 ? per100g.basis : values.per100g,
      perUnitEnabled: values.perUnitEnabled || perUnit.count > 0,
      perUnit: perUnit.count > 0 ? perUnit.basis : values.perUnit,
    },
  }
}

const validWeight = (text: string) => {
  const weight = parseDecimal(text)
  return weight !== null && weight > 0 ? weight : null
}

/**
 * Works out empty values: calories from protein, carbs and fat; the grams per unit from both
 * calories; then each section from the other with the grams per unit. Never replaces a value.
 */
export function calculateMissingValues(values: IngredientFormValues): MissingValuesResult {
  const macros = withMacroKcal(values)
  const weighed = withDerivedWeight(macros.values)
  const weight = validWeight(weighed.values.unitWeightG)
  const converted =
    weight === null ? { values: weighed.values, count: 0 } : withConverted(weighed.values, weight)
  const count = macros.count + weighed.count + converted.count
  if (count === 0) return weight === null ? { kind: 'needsWeight' } : { kind: 'nothing' }
  const kcalFromMacros = macros.count > 0
  return {
    kind: 'filled',
    count,
    kcalFromMacros,
    values: kcalFromMacros ? { ...converted.values, kcalEstimated: true } : converted.values,
  }
}

// ─── filling in from another source ──────────────────────────────────────────────────────────

/**
 * The nutrition of another ingredient or a product, replacing this one's (values, grams and
 * unit, the estimate mark). Name and brand are only taken when still empty; the barcode never.
 */
export function withNutritionOf(
  values: IngredientFormValues,
  source: IngredientFormValues,
): IngredientFormValues {
  return {
    ...values,
    name: values.name.trim() === '' ? source.name : values.name,
    brand: values.brand.trim() === '' ? source.brand : values.brand,
    per100gEnabled: source.per100gEnabled,
    per100g: source.per100gEnabled ? source.per100g : EMPTY_BASIS,
    perUnitEnabled: source.perUnitEnabled,
    perUnit: source.perUnitEnabled ? source.perUnit : EMPTY_BASIS,
    unitLabel: source.unitLabel === '' ? values.unitLabel : source.unitLabel,
    unitWeightG: source.unitWeightG,
    kcalEstimated: source.kcalEstimated,
  }
}

function fillBasis(own: BasisFormValues, ownEnabled: boolean, source: BasisFormValues) {
  const start = ownEnabled ? own : EMPTY_BASIS
  const filled = NUTRITION_FIELDS.filter(
    (field) => isEmpty(start[field]) && !isEmpty(source[field]),
  )
  const basis = Object.fromEntries(
    NUTRITION_FIELDS.map((field) => [field, filled.includes(field) ? source[field] : start[field]]),
  ) as BasisFormValues
  return { basis, count: filled.length }
}

const TEXT_FIELDS = ['name', 'brand', 'unitLabel', 'unitWeightG'] as const

/** Only the empty fields, taken from `source` (e.g. Open Food Facts for a saved ingredient). */
export function fillEmptyFrom(
  values: IngredientFormValues,
  source: IngredientFormValues,
): { readonly values: IngredientFormValues; readonly count: number } {
  const texts = TEXT_FIELDS.filter((key) => isEmpty(values[key]) && !isEmpty(source[key]))
  const per100g = source.per100gEnabled
    ? fillBasis(values.per100g, values.per100gEnabled, source.per100g)
    : { basis: values.per100g, count: 0 }
  const perUnit = source.perUnitEnabled
    ? fillBasis(values.perUnit, values.perUnitEnabled, source.perUnit)
    : { basis: values.perUnit, count: 0 }
  const withTexts = texts.reduce<IngredientFormValues>(
    (current, key) => ({ ...current, [key]: source[key] }),
    values,
  )
  return {
    count: texts.length + per100g.count + perUnit.count,
    values: {
      ...withTexts,
      per100gEnabled: values.per100gEnabled || per100g.count > 0,
      per100g: per100g.count > 0 ? per100g.basis : values.per100g,
      perUnitEnabled: values.perUnitEnabled || perUnit.count > 0,
      perUnit: perUnit.count > 0 ? perUnit.basis : values.perUnit,
    },
  }
}
