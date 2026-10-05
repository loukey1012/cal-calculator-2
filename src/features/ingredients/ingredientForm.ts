import { z } from 'zod'
import { fieldErrors, type FieldErrors } from '../../lib/forms'
import { parseDecimal } from '../../lib/numbers'
import { toWholeKcal } from '../nutrition/format'
import { mapNutrients, NUTRIENT_KEYS } from '../nutrition/types'
import type { Ingredient, IngredientInput } from './ingredientsApi'

/** Category select value meaning "create a new category with the typed name". */
export const NEW_CATEGORY = '__new__'

// grams of anything in 100 g can't exceed 100 (mirrors ingredients_per_100g_max)
const GRAMS_PER_BASIS = 100
// numeric(7, 2) columns hold at most 99999.99; calories get the same practical ceiling
const MAX_NUMBER = 99999.99
const MAX_NAME = 100
const MAX_BRAND = 60
const MAX_CATEGORY = 40
const MAX_NOTE = 500
const MAX_UNIT_LABEL = 30

const BASIS_FIELDS = ['kcal', ...NUTRIENT_KEYS] as const
export type BasisField = (typeof BASIS_FIELDS)[number]
export type BasisFormValues = Readonly<Record<BasisField, string>>

/** Raw text as typed into the form; parsed into database columns by `parseIngredientForm`. */
export type IngredientFormValues = {
  readonly name: string
  readonly brand: string
  /** '' = no category, NEW_CATEGORY = create `newCategoryName` */
  readonly categoryId: string
  readonly newCategoryName: string
  /** broad category of a new category; '' = none ("Other") */
  readonly newCategoryGroupId: string
  readonly note: string
  readonly per100gEnabled: boolean
  readonly per100g: BasisFormValues
  readonly perUnitEnabled: boolean
  readonly perUnit: BasisFormValues
  readonly unitLabel: string
  readonly unitWeightG: string
}

const EMPTY_BASIS: BasisFormValues = { kcal: '', ...mapNutrients(() => '') }

export const EMPTY_INGREDIENT_FORM: IngredientFormValues = {
  name: '',
  brand: '',
  categoryId: '',
  newCategoryName: '',
  newCategoryGroupId: '',
  note: '',
  per100gEnabled: false,
  per100g: EMPTY_BASIS,
  perUnitEnabled: false,
  perUnit: EMPTY_BASIS,
  unitLabel: '',
  unitWeightG: '',
}

export type CategoryChoice =
  | { readonly kind: 'none' }
  | { readonly kind: 'existing'; readonly id: string }
  | { readonly kind: 'new'; readonly name: string; readonly groupId: string | null }

export type ParsedIngredientForm = {
  /** category_id is resolved separately, since a new category may need creating first */
  readonly ingredient: Omit<IngredientInput, 'category_id'>
  readonly category: CategoryChoice
}

export type IngredientFormResult =
  | { readonly success: true; readonly data: ParsedIngredientForm }
  | { readonly success: false; readonly errors: FieldErrors }

/** Why a parsed number is not allowed, or null when it is fine. */
function numberProblem(value: number, maxGramsPer100g?: number): string | null {
  if (maxGramsPer100g !== undefined && value > maxGramsPer100g) {
    return `At most ${maxGramsPer100g} g per 100 g`
  }
  return value > MAX_NUMBER ? 'Too large' : null
}

/** Empty → null (unknown); otherwise a non-negative decimal, "," or "." */
function optionalNumber(maxGramsPer100g?: number) {
  return z.string().transform((raw, ctx) => {
    if (raw.trim() === '') return null
    const value = parseDecimal(raw)
    const problem = value === null ? 'Enter a number' : numberProblem(value, maxGramsPer100g)
    if (problem !== null || value === null) {
      ctx.addIssue({ code: 'custom', message: problem ?? 'Enter a number' })
      return z.NEVER
    }
    return value
  })
}

function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters`)
    .transform((value) => (value === '' ? null : value))
}

function basisSchema(maxGrams?: number) {
  return z.object({ kcal: optionalNumber(), ...mapNutrients(() => optionalNumber(maxGrams)) })
}

type ParsedBasis = z.output<ReturnType<typeof basisSchema>>

const ingredientFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Enter a name')
      .max(MAX_NAME, `Use at most ${MAX_NAME} characters`),
    brand: optionalText(MAX_BRAND),
    categoryId: z.string(),
    newCategoryName: z.string().trim().max(MAX_CATEGORY, `Use at most ${MAX_CATEGORY} characters`),
    newCategoryGroupId: z.string(),
    note: optionalText(MAX_NOTE),
    per100gEnabled: z.boolean(),
    per100g: basisSchema(GRAMS_PER_BASIS),
    perUnitEnabled: z.boolean(),
    perUnit: basisSchema(),
    unitLabel: optionalText(MAX_UNIT_LABEL),
    unitWeightG: optionalNumber().refine(
      (value) => value === null || value > 0,
      'Must be more than 0',
    ),
  })
  .superRefine((form, ctx) => {
    if (!form.per100gEnabled && !form.perUnitEnabled) {
      ctx.addIssue({
        code: 'custom',
        path: ['per100gEnabled'],
        message: 'Add calories per 100 g or per unit',
      })
    }
    if (form.per100gEnabled && form.per100g.kcal === null) {
      ctx.addIssue({ code: 'custom', path: ['per100g', 'kcal'], message: 'Enter the calories' })
    }
    if (form.perUnitEnabled && form.perUnit.kcal === null) {
      ctx.addIssue({ code: 'custom', path: ['perUnit', 'kcal'], message: 'Enter the calories' })
    }
    if (form.categoryId === NEW_CATEGORY && form.newCategoryName === '') {
      ctx.addIssue({ code: 'custom', path: ['newCategoryName'], message: 'Enter a category name' })
    }
  })

const wholeKcal = (kcal: number | null | undefined) => (kcal == null ? null : toWholeKcal(kcal))

function per100gColumns(basis: ParsedBasis | null) {
  return {
    kcal_100: wholeKcal(basis?.kcal),
    protein_100: basis?.protein ?? null,
    carbs_100: basis?.carbs ?? null,
    sugar_100: basis?.sugar ?? null,
    fat_100: basis?.fat ?? null,
    sat_fat_100: basis?.sat_fat ?? null,
    fiber_100: basis?.fiber ?? null,
    salt_100: basis?.salt ?? null,
  }
}

function perUnitColumns(basis: ParsedBasis | null) {
  return {
    kcal_unit: wholeKcal(basis?.kcal),
    protein_unit: basis?.protein ?? null,
    carbs_unit: basis?.carbs ?? null,
    sugar_unit: basis?.sugar ?? null,
    fat_unit: basis?.fat ?? null,
    sat_fat_unit: basis?.sat_fat ?? null,
    fiber_unit: basis?.fiber ?? null,
    salt_unit: basis?.salt ?? null,
  }
}

type CategoryFields = Pick<
  IngredientFormValues,
  'categoryId' | 'newCategoryName' | 'newCategoryGroupId'
>

function categoryChoice({
  categoryId,
  newCategoryName,
  newCategoryGroupId,
}: CategoryFields): CategoryChoice {
  if (categoryId === NEW_CATEGORY)
    return { kind: 'new', name: newCategoryName, groupId: newCategoryGroupId || null }
  return categoryId === '' ? { kind: 'none' } : { kind: 'existing', id: categoryId }
}

export function parseIngredientForm(values: IngredientFormValues): IngredientFormResult {
  const result = ingredientFormSchema.safeParse(values)
  if (!result.success) return { success: false, errors: fieldErrors(result.error) }

  const form = result.data
  return {
    success: true,
    data: {
      ingredient: {
        name: form.name,
        brand: form.brand,
        note: form.note,
        // a switched-off section is cleared, even if something was typed into it
        ...per100gColumns(form.per100gEnabled ? form.per100g : null),
        ...perUnitColumns(form.perUnitEnabled ? form.perUnit : null),
        unit_label: form.unitLabel,
        unit_weight_g: form.unitWeightG,
      },
      category: categoryChoice(form),
    },
  }
}

const asText = (value: string | number | null) => (value === null ? '' : String(value))

export function toFormValues(ingredient: Ingredient): IngredientFormValues {
  return {
    name: ingredient.name,
    brand: asText(ingredient.brand),
    categoryId: ingredient.category_id ?? '',
    newCategoryName: '',
    newCategoryGroupId: '',
    note: asText(ingredient.note),
    per100gEnabled: ingredient.kcal_100 !== null,
    per100g: {
      kcal: asText(ingredient.kcal_100),
      ...mapNutrients((key) => asText(ingredient[`${key}_100`])),
    },
    perUnitEnabled: ingredient.kcal_unit !== null,
    perUnit: {
      kcal: asText(ingredient.kcal_unit),
      ...mapNutrients((key) => asText(ingredient[`${key}_unit`])),
    },
    unitLabel: asText(ingredient.unit_label),
    unitWeightG: asText(ingredient.unit_weight_g),
  }
}
