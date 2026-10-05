// Converts documents of the old Firebase `foods` collection into ingredient rows.
// Firestore data is untrusted: every field is checked, unusable foods are skipped with a reason.

const MAX_NAME = 100
const MAX_BRAND = 60
const MAX_CATEGORY = 40
const MAX_NOTE = 500
const GRAMS_PER_BASIS = 100

export type FirestoreFood = Readonly<Record<string, unknown>>

export type ImportedIngredient = {
  readonly legacy_id: string
  readonly name: string
  readonly brand: string | null
  readonly note: string | null
  readonly categoryName: string | null
  readonly kcal_100: number | null
  readonly protein_100: number | null
  readonly kcal_unit: number | null
  readonly protein_unit: number | null
  readonly unit_weight_g: number | null
  readonly created_at: string | null
}

export type SkippedFood = { readonly id: string; readonly name: string; readonly reason: string }

export type FoodResult =
  | { readonly ok: true; readonly ingredient: ImportedIngredient }
  | { readonly ok: false; readonly skipped: SkippedFood }

class SkipFood extends Error {}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function limitedText(value: unknown, max: number, field: string): string | null {
  const result = text(value)
  if (result !== null && result.length > max) {
    throw new SkipFood(`${field} is longer than ${max} characters`)
  }
  return result
}

/** null for missing/empty; numbers may be stored as text, with "," or "." */
function number(value: unknown, field: string): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'string' ? Number(value.trim().replace(',', '.')) : value
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) {
    throw new SkipFood(`${field} is not a number`)
  }
  if (parsed < 0) throw new SkipFood(`${field} is negative`)
  return parsed
}

const wholeKcal = (kcal: number | null) => (kcal === null ? null : Math.ceil(kcal))

function isoTimestamp(value: unknown): string | null {
  const raw = text(value)
  return raw !== null && !Number.isNaN(Date.parse(raw)) ? raw : null
}

function toIngredient(id: string, data: FirestoreFood): ImportedIngredient {
  const name = limitedText(data.name, MAX_NAME, 'name')
  if (name === null) throw new SkipFood('no name')

  const kcal100 = wholeKcal(number(data.cal_100, 'cal_100'))
  const kcalUnit = wholeKcal(number(data.cal_unit, 'cal_unit'))
  const protein100 = number(data.prot_100, 'prot_100')
  const proteinUnit = number(data.prot_unit, 'prot_unit')
  const unitWeight = number(data.weight_unit, 'weight_unit')

  if (kcal100 === null && kcalUnit === null) throw new SkipFood('no calories')
  if (protein100 !== null && kcal100 === null) {
    throw new SkipFood('protein per 100 g without calories per 100 g')
  }
  if (proteinUnit !== null && kcalUnit === null) {
    throw new SkipFood('protein per unit without calories per unit')
  }
  if (protein100 !== null && protein100 > GRAMS_PER_BASIS) {
    throw new SkipFood('more than 100 g protein per 100 g')
  }

  return {
    legacy_id: id,
    name,
    brand: limitedText(data.brand, MAX_BRAND, 'brand'),
    note: limitedText(data.note, MAX_NOTE, 'note'),
    categoryName: limitedText(data.category, MAX_CATEGORY, 'category'),
    kcal_100: kcal100,
    protein_100: protein100,
    kcal_unit: kcalUnit,
    protein_unit: proteinUnit,
    // the old app stored 0 for "not set"
    unit_weight_g: unitWeight !== null && unitWeight > 0 ? unitWeight : null,
    created_at: isoTimestamp(data.created_at),
  }
}

export function transformFood(id: string, data: FirestoreFood): FoodResult {
  try {
    return { ok: true, ingredient: toIngredient(id, data) }
  } catch (error) {
    if (!(error instanceof SkipFood)) throw error
    return { ok: false, skipped: { id, name: String(data.name ?? ''), reason: error.message } }
  }
}

export type TransformResult = {
  readonly ingredients: readonly ImportedIngredient[]
  readonly skipped: readonly SkippedFood[]
  /** distinct category names (first spelling wins, compared case-insensitively) */
  readonly categories: readonly string[]
}

export function transformFoods(
  docs: ReadonlyArray<{ readonly id: string; readonly data: FirestoreFood }>,
): TransformResult {
  const results = docs.map(({ id, data }) => transformFood(id, data))
  const ingredients = results.flatMap((result) => (result.ok ? [result.ingredient] : []))
  const skipped = results.flatMap((result) => (result.ok ? [] : [result.skipped]))
  return { ingredients, skipped, categories: distinctCategories(ingredients) }
}

/** distinct category names (first spelling wins, compared case-insensitively) */
export function distinctCategories(ingredients: readonly ImportedIngredient[]): readonly string[] {
  return ingredients
    .map((ingredient) => ingredient.categoryName)
    .filter((name): name is string => name !== null)
    .filter(
      (name, index, names) =>
        names.findIndex((other) => other.toLowerCase() === name.toLowerCase()) === index,
    )
}
