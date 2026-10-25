import { z } from 'zod'
import { roundTo } from '../../lib/numbers'
import { EMPTY_INGREDIENT_FORM, type IngredientFormValues } from '../ingredients/ingredientForm'
import { NUTRITION_FIELDS, type NutritionBasis, type NutritionField } from '../nutrition/bases'
import type { Measure } from '../nutrition/types'
import { nutritionWarnings, resolveNutrition } from './productNutrition'

/**
 * Product data from Open Food Facts (free, open, no account), used to fill in a new ingredient.
 * Nothing is saved from it without the user checking the form first.
 */

const API = 'https://world.openfoodfacts.org/api/v2/product'
// the app's own address for search.openfoodfacts.org (see vercel.json and vite.config.ts)
const SEARCH_API = '/off/search'
const SEARCH_LANGUAGES = 'de,en'
const FIELDS =
  'product_name,product_name_de,brands,serving_quantity,serving_quantity_unit,serving_size,product_quantity,product_quantity_unit,quantity,image_front_small_url,nutriments'
const TIMEOUT_MS = 6000
const SEARCH_TIMEOUT_MS = 10000
const SEARCH_PAGE_SIZE = 20
// answers when Open Food Facts gets too many searches
const BUSY_STATUSES = new Set([429, 503])
const IMAGE_HOST = 'https://images.openfoodfacts.org/'
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
// how many g or ml one of each unit is
const MEASURE_UNITS: Readonly<Record<Measure, Readonly<Record<string, number>>>> = {
  g: { g: 1, gr: 1, gram: 1, grams: 1 },
  ml: { ml: 1, cl: 10, dl: 100, l: 1000 },
}
const MEASURES: readonly Measure[] = ['g', 'ml']
// a printed pack size, e.g. "50g", "50 gram", "1,5 l", "33 cl" (not "6 x 50 g")
const PRINTED_AMOUNT = /^\s*(\d+(?:[.,]\d+)?)\s*([a-z]+)\s*$/i

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
  // a text from the product API, a list from the search
  brands: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((brands) => (Array.isArray(brands) ? brands.join(',') : brands))
    .catch(undefined),
  serving_quantity: amount,
  serving_quantity_unit: z.string().optional().catch(undefined),
  product_quantity: amount,
  product_quantity_unit: z.string().optional().catch(undefined),
  /** the pack size as printed, e.g. "50 g" */
  quantity: z.string().optional().catch(undefined),
  /** the portion as printed, e.g. "3 Kekse (30 g)" */
  serving_size: z.string().optional().catch(undefined),
  image_front_small_url: z.string().optional().catch(undefined),
  nutriments: z.record(z.string(), z.unknown()).optional(),
})

export type OffProduct = z.input<typeof productSchema>

const responseSchema = z.object({ status: z.number(), product: productSchema.optional() })

/** What the package says, shown next to the filled-in form to tell it's the right product. */
export type ProductInfo = {
  /** a small photo of the front, from Open Food Facts' image server */
  readonly imageUrl: string | null
  /** the portion as printed, e.g. "3 Kekse (30 g)" */
  readonly portion: string | null
  /** the pack size as printed, e.g. "150 g" */
  readonly pack: string | null
}

export type ProductLookup =
  | ({ readonly kind: 'found' } & ProductPrefill)
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

const unitKey = (unit: string) => unit.trim().toLowerCase()

/** g for "g" or "gram", ml for "ml", "cl" or "l"; null for anything else (e.g. "tbsp") */
function measureOf(unit: string | undefined): Measure | null {
  if (unit === undefined) return null
  return MEASURES.find((measure) => unitKey(unit) in MEASURE_UNITS[measure]) ?? null
}

function printedPack(product: ParsedProduct) {
  const match = PRINTED_AMOUNT.exec(product.quantity ?? '')
  if (!match?.[1] || !match[2] || measureOf(match[2]) === null) return null
  return { quantity: Number(match[1].replace(',', '.')), unit: match[2] }
}

/** ml for a product sold or portioned by volume (a drink), otherwise g. */
function productMeasure(product: ParsedProduct): Measure {
  const units = [
    product.product_quantity_unit,
    product.serving_quantity_unit,
    printedPack(product)?.unit,
  ]
  return units.some((unit) => measureOf(unit) === 'ml') ? 'ml' : 'g'
}

/**
 * An amount in g or ml; a quantity in another unit (e.g. "2 tbsp") isn't one. Without a unit,
 * Open Food Facts means the product's own measure.
 */
function amountIn(
  measure: Measure,
  quantity: number | undefined,
  unit: string | undefined,
): number | null {
  if (quantity === undefined || quantity <= 0) return null
  if (unit === undefined) return quantity
  const factor = MEASURE_UNITS[measure][unitKey(unit)]
  return factor === undefined ? null : quantity * factor
}

function packAmount(product: ParsedProduct, measure: Measure): number | null {
  const stated = amountIn(measure, product.product_quantity, product.product_quantity_unit)
  if (stated !== null) return stated
  const printed = printedPack(product)
  return printed ? amountIn(measure, printed.quantity, printed.unit) : null
}

function reportedNutrition(product: ParsedProduct, measure: Measure) {
  const nutriments = product.nutriments ?? {}
  return {
    measure,
    // Open Food Facts keeps a drink's values per 100 ml under _100g
    per100g: basisOf(nutriments, '_100g'),
    perPortion: basisOf(nutriments, '_serving'),
    portionG: amountIn(measure, product.serving_quantity, product.serving_quantity_unit),
    packG: packAmount(product, measure),
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
function titleCase(name: string): string {
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
  /** gaps in the product data; empty when there are none */
  readonly warnings: readonly string[]
  readonly info: ProductInfo
}

const printed = (text: string | undefined) => text?.trim() || null

function productInfo(product: ParsedProduct): ProductInfo {
  const image = product.image_front_small_url?.trim() ?? ''
  return {
    imageUrl: image.startsWith(IMAGE_HOST) ? image : null,
    portion: printed(product.serving_size),
    pack: printed(product.quantity),
  }
}

/**
 * The new-ingredient form filled in from a product: per 100 g and per portion as stated, each
 * worked out from the other where missing; unknown values stay empty.
 */
export function productPrefill(raw: OffProduct, barcode: string): ProductPrefill {
  const product = productSchema.parse(raw)
  const measure = productMeasure(product)
  const reported = reportedNutrition(product, measure)
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
      measure,
      unitWeightG: asText(reported.portionG),
    },
    warnings: nutritionWarnings(reported),
    info: productInfo(product),
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

const hitSchema = productSchema.extend({ code: z.string() })
const searchSchema = z.object({ hits: z.array(z.unknown()) })

export type ProductHit = ProductPrefill & {
  readonly barcode: string
}

export type ProductSearch =
  | { readonly kind: 'found'; readonly hits: readonly ProductHit[] }
  /** too many searches in a short time */
  | { readonly kind: 'busy' }
  | { readonly kind: 'unavailable' }

function toHit(raw: unknown): ProductHit | null {
  const parsed = hitSchema.safeParse(raw)
  if (!parsed.success) return null
  const prefill = productPrefill(parsed.data, parsed.data.code)
  const { values } = prefill
  // without a name or any calories there is nothing to take over
  const usable = values.name !== '' && (values.per100gEnabled || values.perUnitEnabled)
  return usable ? { ...prefill, barcode: parsed.data.code } : null
}

/** Products whose name matches, best match first; never throws. */
export async function searchProducts(query: string): Promise<ProductSearch> {
  const params = new URLSearchParams({
    q: query.trim(),
    langs: SEARCH_LANGUAGES,
    page_size: String(SEARCH_PAGE_SIZE),
    fields: `code,${FIELDS}`,
  })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS)
  try {
    const response = await fetch(`${SEARCH_API}?${params}`, { signal: controller.signal })
    if (BUSY_STATUSES.has(response.status)) return { kind: 'busy' }
    const parsed = searchSchema.safeParse(await response.json().catch(() => null))
    if (!response.ok || !parsed.success) return { kind: 'unavailable' }
    const hits = parsed.data.hits.flatMap((raw) => toHit(raw) ?? [])
    return { kind: 'found', hits }
  } catch {
    return { kind: 'unavailable' }
  } finally {
    clearTimeout(timer)
  }
}
