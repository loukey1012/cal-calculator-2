import { z } from 'zod'
import type { Json } from '../../lib/database.types'
import type { Category, Ingredient, IngredientInput } from '../ingredients/ingredientsApi'
import { NUTRIENT_KEYS, type NutrientKey } from '../nutrition/types'

/** The other ingredient a duplicate finding names, or null (findings written before item 39). */
export function duplicateOf(suggestion: Json): string | null {
  const parsed = z.object({ duplicate_of: z.uuid() }).safeParse(suggestion)
  return parsed.success ? parsed.data.duplicate_of : null
}

/** A field the merge can take over from the other ingredient. */
export type MergeField = keyof IngredientInput & keyof Ingredient

type MergeRow = {
  readonly field: MergeField
  readonly label: string
  /** shown for the kept one and for the other one */
  readonly keep: string
  readonly other: string
  readonly differs: boolean
}

const NUTRIENT_LABELS: Record<NutrientKey, string> = {
  fat: 'Fat',
  sat_fat: 'Saturated fat',
  carbs: 'Carbs',
  sugar: 'Sugar',
  fiber: 'Fiber',
  protein: 'Protein',
  salt: 'Salt',
}

type Shown = (value: Ingredient[MergeField], categories: readonly Category[]) => string

const plain: Shown = (value) => (value === null || value === '' ? '–' : String(value))
const grams: Shown = (value) => (value === null ? '–' : `${String(value)} g`)

/** The compared fields, in the order the comparison lists them. */
const ROWS: ReadonlyArray<readonly [MergeField, string, Shown]> = [
  ['name', 'Name', plain],
  ['brand', 'Brand', plain],
  [
    'category_id',
    'Category',
    (id, categories) => categories.find((category) => category.id === id)?.name ?? '–',
  ],
  ['measure', 'Measured in', plain],
  ['kcal_100', 'kcal / 100', plain],
  ...NUTRIENT_KEYS.map(
    (key) => [`${key}_100` as MergeField, `${NUTRIENT_LABELS[key]} / 100`, grams] as const,
  ),
  ['unit_label', 'Unit', plain],
  ['unit_weight_g', 'Unit weight', grams],
  ['kcal_unit', 'kcal / unit', plain],
  ...NUTRIENT_KEYS.map(
    (key) => [`${key}_unit` as MergeField, `${NUTRIENT_LABELS[key]} / unit`, grams] as const,
  ),
  ['barcode', 'Barcode', plain],
  ['kcal_estimated', 'Estimate', (value) => (value ? 'yes' : 'no')],
]

/** Both ingredients field by field; empty rows (nothing on either side) are left out. */
export function mergeRows(
  keep: Ingredient,
  other: Ingredient,
  categories: readonly Category[],
): MergeRow[] {
  return ROWS.flatMap(([field, label, shown]) => {
    const row = {
      field,
      label,
      keep: shown(keep[field], categories),
      other: shown(other[field], categories),
      differs: keep[field] !== other[field],
    }
    return row.keep === '–' && row.other === '–' ? [] : [row]
  })
}

/** The values taken over from the other ingredient, as a change to the kept one. */
export function takenValues(
  other: Ingredient,
  taken: ReadonlySet<MergeField>,
): Partial<IngredientInput> {
  return Object.fromEntries([...taken].map((field) => [field, other[field]]))
}
