import { z } from 'zod'
import { roundTo } from '../../lib/numbers'
import { EMPTY_INGREDIENT_FORM, type IngredientFormValues } from '../ingredients/ingredientForm'
import type { NutrientKey } from '../nutrition/types'

/**
 * Product data from Open Food Facts (free, open, no account), used to fill in a new ingredient.
 * Nothing is saved from it without the user checking the form first.
 */

const API = 'https://world.openfoodfacts.org/api/v2/product'
const FIELDS = 'product_name,product_name_de,brands,serving_quantity,nutriments'
const TIMEOUT_MS = 6000
const KJ_PER_KCAL = 4.184
const NUTRIENT_DECIMALS = 2
// the ingredient form's limits
const MAX_NAME = 100
const MAX_BRAND = 60
const SERVING_LABEL = 'Portion'

const OFF_NUTRIENTS: Readonly<Record<NutrientKey, string>> = {
  protein: 'proteins_100g',
  carbs: 'carbohydrates_100g',
  sugar: 'sugars_100g',
  fat: 'fat_100g',
  sat_fat: 'saturated-fat_100g',
  fiber: 'fiber_100g',
  salt: 'salt_100g',
}

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
  nutriments: z.record(z.string(), z.unknown()).optional(),
})

export type OffProduct = z.input<typeof productSchema>

const responseSchema = z.object({ status: z.number(), product: productSchema.optional() })

export type ProductLookup =
  | { readonly kind: 'found'; readonly values: IngredientFormValues }
  | { readonly kind: 'notFound' }
  /** offline, too slow, or an answer that can't be used */
  | { readonly kind: 'unavailable' }

function nutrient(nutriments: Record<string, unknown>, key: string): number | null {
  const parsed = amount.parse(nutriments[key])
  return parsed === undefined ? null : parsed
}

function kcalPer100g(nutriments: Record<string, unknown>): number | null {
  const kcal = nutrient(nutriments, 'energy-kcal_100g')
  if (kcal !== null) return kcal
  const kj = nutrient(nutriments, 'energy-kj_100g')
  return kj === null ? null : kj / KJ_PER_KCAL
}

const asText = (value: number | null) =>
  value === null ? '' : String(roundTo(value, NUTRIENT_DECIMALS))

function firstBrand(brands: string | undefined): string {
  return (brands ?? '').split(',')[0]?.trim() ?? ''
}

function productName(product: z.output<typeof productSchema>): string {
  const german = product.product_name_de?.trim()
  return german || product.product_name?.trim() || ''
}

/** The new-ingredient form filled in from a product; unknown values stay empty. */
export function productFormValues(raw: OffProduct, barcode: string): IngredientFormValues {
  const product = productSchema.parse(raw)
  const nutriments = product.nutriments ?? {}
  const kcal = kcalPer100g(nutriments)
  const serving = product.serving_quantity
  const hasServing = serving !== undefined && serving > 0
  return {
    ...EMPTY_INGREDIENT_FORM,
    name: productName(product).slice(0, MAX_NAME),
    brand: firstBrand(product.brands).slice(0, MAX_BRAND),
    barcode,
    per100gEnabled: kcal !== null,
    per100g: {
      kcal: kcal === null ? '' : String(Math.round(kcal)),
      protein: asText(nutrient(nutriments, OFF_NUTRIENTS.protein)),
      carbs: asText(nutrient(nutriments, OFF_NUTRIENTS.carbs)),
      sugar: asText(nutrient(nutriments, OFF_NUTRIENTS.sugar)),
      fat: asText(nutrient(nutriments, OFF_NUTRIENTS.fat)),
      sat_fat: asText(nutrient(nutriments, OFF_NUTRIENTS.sat_fat)),
      fiber: asText(nutrient(nutriments, OFF_NUTRIENTS.fiber)),
      salt: asText(nutrient(nutriments, OFF_NUTRIENTS.salt)),
    },
    unitLabel: hasServing ? SERVING_LABEL : '',
    unitWeightG: hasServing ? asText(serving) : '',
  }
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
    return { kind: 'found', values: productFormValues(parsed.data.product, barcode) }
  } catch {
    return { kind: 'unavailable' }
  } finally {
    clearTimeout(timer)
  }
}
