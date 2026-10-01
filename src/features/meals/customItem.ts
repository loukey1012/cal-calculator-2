import { z } from 'zod'
import { fieldErrors, type FieldErrors } from '../../lib/forms'
import { parseDecimal } from '../../lib/numbers'
import type { MealItemSource } from '../nutrition/fromIngredient'
import type { AmountUnit, NutritionBasis, NutritionValues } from '../nutrition/types'

// meal_items nutrient columns are numeric(7, 2)
const MAX_NUMBER = 99999.99
const MAX_NAME = 100

/** A quick one-off item: logged with its own values, not saved to the ingredient database. */
export type CustomItemValues = {
  readonly name: string
  readonly basis: NutritionBasis
  readonly kcal: string
  readonly protein: string
  readonly carbs: string
  readonly fat: string
  readonly amount: string
}

export const EMPTY_CUSTOM_ITEM: CustomItemValues = {
  name: '',
  basis: 'per_100g',
  kcal: '',
  protein: '',
  carbs: '',
  fat: '',
  amount: '',
}

export type ParsedCustomItem = {
  readonly source: MealItemSource
  readonly amount: number
  readonly unit: AmountUnit
}

export type CustomItemResult =
  | { readonly success: true; readonly data: ParsedCustomItem }
  | { readonly success: false; readonly errors: FieldErrors }

function numberField(emptyMessage: string | null, invalidMessage = 'Enter a number') {
  return z.string().transform((raw, ctx) => {
    if (raw.trim() === '') {
      if (emptyMessage === null) return null
      ctx.addIssue({ code: 'custom', message: emptyMessage })
      return z.NEVER
    }
    const value = parseDecimal(raw)
    if (value === null || value > MAX_NUMBER) {
      ctx.addIssue({ code: 'custom', message: value === null ? invalidMessage : 'Too large' })
      return z.NEVER
    }
    return value
  })
}

const customItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a name')
    .max(MAX_NAME, `Use at most ${MAX_NAME} characters`),
  basis: z.enum(['per_100g', 'per_unit']),
  kcal: numberField('Enter the calories'),
  protein: numberField(null),
  carbs: numberField(null),
  fat: numberField(null),
  amount: numberField('Enter an amount', 'Enter an amount').refine(
    (value) => value !== null && value > 0,
    'Enter an amount',
  ),
})

export function parseCustomItem(values: CustomItemValues): CustomItemResult {
  const result = customItemSchema.safeParse(values)
  if (!result.success) return { success: false, errors: fieldErrors(result.error) }

  const { name, basis, kcal, protein, carbs, fat, amount } = result.data
  const nutrition: NutritionValues = {
    kcal: kcal ?? 0,
    protein,
    carbs,
    sugar: null,
    fat,
    sat_fat: null,
    fiber: null,
    salt: null,
  }
  const perUnit = basis === 'per_unit'
  return {
    success: true,
    data: {
      source: {
        ingredientId: null,
        name,
        brand: null,
        nutrition: {
          per100g: perUnit ? null : nutrition,
          perUnit: perUnit ? nutrition : null,
          unitWeightG: null,
        },
      },
      amount: amount ?? 0,
      unit: perUnit ? 'unit' : 'g',
    },
  }
}
