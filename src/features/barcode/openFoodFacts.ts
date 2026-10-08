import { z } from 'zod'
import { roundTo } from '../../lib/numbers'
import { EMPTY_INGREDIENT_FORM, type IngredientFormValues } from '../ingredients/ingredientForm'
import { NUTRITION_FIELDS, type NutritionBasis, type NutritionField } from '../nutrition/bases'
import { nutritionWarnings, resolveNutrition } from './productNutrition'

/**
 * Product data from Open Food Facts (free, open, no account), used to fill in a new ingredient.
 * Nothing is saved from it without the user checking the form first.
 */

const API = 'https://world.openfoodfacts.org/api/v2/product'
const FIELDS =
  'product_name,product_name_de,brands,serving_quantity,serving_quantity_unit,product_quantity,product_quantity_unit,quantity,nutriments'
const TIMEOUT_MS = 6000
const KJ_PER_KCAL = 4.184
const NUTRIENT_DECIMALS = 2
// the ingredient form's limits
const MAX_NAME = 100
const MAX_BRAND = 60

// Open Food Facts names, without the _100g / _serving ending
const OFF_NAMES: Readonly<Record<Exclude<NutritionField, 'kcal'>, string>> = {
  protein: 'proteins',
  carbs: 'carbohydrates',
  sugar: 'sugars',
  fat: 'fat',
  sat_fat: 'saturated-fat',
  fiber: 'fiber',
  salt: 'salt',
}
const GRAM_UNITS = new Set(['g', 'gr', 'gram', 'grams'])
// a printed pack size in grams, e.g. "50g", "50 gram", "1,5 g" (not "6 x 50 g")
const PRINTED_GRAMS = /^\s*(\d+(?:[.,]\d+)?)\s*(g|gr|gram|grams)\s*$/i

// numbers sometimes arrive as text; null and empty text mean unknown, not 0
const amount = z
  .preprocess(
    (value) =>
      value === null || (typeof value === 'string' && value.trim() === '') ? undefined : value,
    z.coerce.number().finite().nonnegative().optional(),
  )
  .catch(undefined)

const productSchema = z.object({
  product_name: z.string().optional(),
  product_name_de: z.string().optional(),
  brands: z.string().optional(),
  serving_quantity: amount,
  serving_quantity_unit: z.string().optional().catch(undefined),
  product_quantity: amount,
  product_quantity_unit: z.string().optional().catch(undefined),
  /** the pack size as printed, e.g. "50 g" */
  quantity: z.string().optional().catch(undefined),
  nutriments: z.record(z.string(), z.unknown()).optional(),
})

export type OffProduct = z.input<typeof productSchema>

const responseSchema = z.object({ status: z.number(), product: productSchema.optional() })

export type ProductLookup =
  | {
      readonly kind: 'found'
      readonly values: IngredientFormValues
      /** things to check against the package; empty when the data looks right */
      readonly warnings: readonly string[]
    }
  | { readonly kind: 'notFound' }
  /** offline, too slow, or an answer that can't be used */
  | { readonly kind: 'unavailable' }

function nutrient(nutriments: Record<string, unknown>, key: string): number | null {
  const parsed = amount.parse(nutriments[key])
  return parsed === undefined ? null : parsed
}

type Suffix = '_100g' | '_serving'

function kcalOf(nutriments: Record<string, unknown>, suffix: Suffix): number | null {
  const kcal = nutrient(nutriments, `energy-kcal${suffix}`)
  if (kcal !== null) return kcal
  const kj = nutrient(nutriments, `energy-kj${suffix}`)
  return kj === null ? null : kj / KJ_PER_KCAL
}

function basisOf(nutriments: Record<string, unknown>, suffix: Suffix): NutritionBasis {
  return {
    kcal: kcalOf(nutriments, suffix),
    protein: nutrient(nutriments, `${OFF_NAMES.protein}${suffix}`),
    carbs: nutrient(nutriments, `${OFF_NAMES.carbs}${suffix}`),
    sugar: nutrient(nutriments, `${OFF_NAMES.sugar}${suffix}`),
    fat: nutrient(nutriments, `${OFF_NAMES.fat}${suffix}`),
    sat_fat: nutrient(nutriments, `${OFF_NAMES.sat_fat}${suffix}`),
    fiber: nutrient(nutriments, `${OFF_NAMES.fiber}${suffix}`),
    salt: nutrient(nutriments, `${OFF_NAMES.salt}${suffix}`),
  }
}

/** A weight in grams; a quantity in another unit (e.g. "2 tbsp") isn't one. */
function grams(quantity: number | undefined, unit: string | undefined): number | null {
  if (quantity === undefined || quantity <= 0) return null
  return unit === undefined || GRAM_UNITS.has(unit.trim().toLowerCase()) ? quantity : null
}

function packGrams(product: ParsedProduct): number | null {
  const stated = grams(product.product_quantity, product.product_quantity_unit)
  if (stated !== null) return stated
  const printed = PRINTED_GRAMS.exec(product.quantity ?? '')
  return printed?.[1] ? Number(printed[1].replace(',', '.')) : null
}

function reportedNutrition(product: ParsedProduct) {
  const nutriments = product.nutriments ?? {}
  return {
    per100g: basisOf(nutriments, '_100g'),
    perPortion: basisOf(nutriments, '_serving'),
    portionG: grams(product.serving_quantity, product.serving_quantity_unit),
    packG: packGrams(product),
  }
}

const asText = (value: number | null) =>
  value === null ? '' : String(roundTo(value, NUTRIENT_DECIMALS))

function formBasis(basis: NutritionBasis): IngredientFormValues['per100g'] {
  const text = Object.fromEntries(
    NUTRITION_FIELDS.map((field) => [
      field,
      field === 'kcal'
        ? basis.kcal === null
          ? ''
          : String(Math.round(basis.kcal))
        : asText(basis[field]),
    ]),
  )
  return text as IngredientFormValues['per100g']
}

function firstBrand(brands: string | undefined): string {
  return (brands ?? '').split(',')[0]?.trim() ?? ''
}

type ParsedProduct = z.output<typeof productSchema>

const capitalized = (part: string) =>
  part.charAt(0).toLocaleUpperCase() + part.slice(1).toLocaleLowerCase()

/** e.g. "LOW SUGAR gummies coca-cola" → "Low Sugar Gummies Coca-Cola" */
export function titleCase(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.split('-').map(capitalized).join('-'))
    .join(' ')
}

function productName(product: ParsedProduct): string {
  const german = product.product_name_de?.trim()
  return german || product.product_name?.trim() || ''
}

export type ProductPrefill = {
  readonly values: IngredientFormValues
  readonly warnings: readonly string[]
}

/**
 * The new-ingredient form filled in from a product: per 100 g and per portion as stated, each
 * worked out from the other where missing; unknown values stay empty.
 */
export function productPrefill(raw: OffProduct, barcode: string): ProductPrefill {
  const product = productSchema.parse(raw)
  const reported = reportedNutrition(product)
  const { per100g, perPortion } = resolveNutrition(reported)
  return {
    values: {
      ...EMPTY_INGREDIENT_FORM,
      name: titleCase(productName(product)).slice(0, MAX_NAME),
      brand: firstBrand(product.brands).slice(0, MAX_BRAND),
      barcode,
      per100gEnabled: per100g.kcal !== null,
      per100g: formBasis(per100g),
      perUnitEnabled: perPortion.kcal !== null,
      perUnit: formBasis(perPortion),
      unitWeightG: asText(reported.portionG),
    },
    warnings: nutritionWarnings(reported),
  }
}

export function productFormValues(raw: OffProduct, barcode: string): IngredientFormValues {
  return productPrefill(raw, barcode).values
}

/** Looks a barcode up; never throws, so a missing answer just means typing the values in. */
export async function lookupProduct(barcode: string): Promise<ProductLookup> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(`${API}/${encodeURIComponent(barcode)}?fields=${FIELDS}`, {
      signal: controller.signal,
    })
    const body: unknown = await response.json().catch(() => null)
    const parsed = responseSchema.safeParse(body)
    if (response.status === 404 || (parsed.success && parsed.data.status === 0)) {
      return { kind: 'notFound' }
    }
    if (!response.ok || !parsed.success || !parsed.data.product) return { kind: 'unavailable' }
    return { kind: 'found', ...productPrefill(parsed.data.product, barcode) }
  } catch {
    return { kind: 'unavailable' }
  } finally {
    clearTimeout(timer)
  }
}
