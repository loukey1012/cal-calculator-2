import { z } from 'zod'
import type { Json } from '../../lib/database.types'
import type { Ingredient, IngredientInput } from '../ingredients/ingredientsApi'
import { NUTRIENT_KEYS } from '../nutrition/types'

/**
 * A finding's suggested fix: ingredient column -> new value, written by the review routine.
 * It comes from outside the app, so only these fields are taken, and only valid values.
 */
const text = (max: number) => z.string().trim().min(1).max(max)
const kcal = z.number().int().min(0).nullable()
const amount = z.number().min(0).max(99_999.99).nullable()

const NUTRIENT_LABELS: Record<(typeof NUTRIENT_KEYS)[number], string> = {
  fat: 'Fat',
  sat_fat: 'Saturated fat',
  carbs: 'Carbs',
  sugar: 'Sugar',
  fiber: 'Fiber',
  protein: 'Protein',
  salt: 'Salt',
}

type Field = {
  readonly schema: z.ZodType
  readonly label: (ingredient: Ingredient) => string
  readonly suffix?: (ingredient: Ingredient) => string
}

const per100 = ({ measure }: Ingredient) => (measure === 'ml' ? 'per 100 ml' : 'per 100 g')

/** The fields a fix may change, in the order they are shown. */
const FIELDS: ReadonlyArray<readonly [keyof IngredientInput, Field]> = [
  ['name', { schema: text(100), label: () => 'Name' }],
  ['brand', { schema: text(60).nullable(), label: () => 'Brand' }],
  ['unit_label', { schema: text(30).nullable(), label: () => 'Unit name' }],
  [
    'unit_weight_g',
    {
      schema: z.number().positive().max(99_999.99).nullable(),
      label: ({ measure }) => (measure === 'ml' ? 'Unit size' : 'Unit weight'),
      suffix: ({ measure }) => (measure === 'ml' ? ' ml' : ' g'),
    },
  ],
  ['kcal_100', { schema: kcal, label: (i) => `Calories ${per100(i)}` }],
  ...NUTRIENT_KEYS.map(
    (key) =>
      [
        `${key}_100` as keyof IngredientInput,
        { schema: amount, label: (i: Ingredient) => `${NUTRIENT_LABELS[key]} ${per100(i)}` },
      ] as const,
  ),
  ['kcal_unit', { schema: kcal, label: () => 'Calories per unit' }],
  ...NUTRIENT_KEYS.map(
    (key) =>
      [
        `${key}_unit` as keyof IngredientInput,
        { schema: amount, label: () => `${NUTRIENT_LABELS[key]} per unit` },
      ] as const,
  ),
]

export type IngredientPatch = Partial<IngredientInput>

/** The ingredient fields a fix may change (the review script checks against the same list). */
export const SUGGESTABLE_FIELDS: readonly string[] = FIELDS.map(([field]) => field)

/** The fix as a change to the ingredient; null if any value couldn't be saved as it is. */
export function suggestionPatch(suggestion: Json): IngredientPatch | null {
  if (typeof suggestion !== 'object' || suggestion === null || Array.isArray(suggestion)) {
    return null
  }
  const patch: Record<string, unknown> = {}
  for (const [field, { schema }] of FIELDS) {
    if (!(field in suggestion)) continue
    const parsed = schema.safeParse(suggestion[field])
    if (!parsed.success) return null
    patch[field] = parsed.data
  }
  return patch as IngredientPatch
}

export type Change = { readonly label: string; readonly from: string; readonly to: string }

/** What applying the fix would change, e.g. "Name: Buter → Butter". */
export function describeChanges(ingredient: Ingredient, patch: IngredientPatch): Change[] {
  return FIELDS.flatMap(([field, { label, suffix }]) => {
    if (!(field in patch)) return []
    const from = ingredient[field] ?? null
    const to = patch[field] ?? null
    if (from === to) return []
    const shown = (value: unknown) =>
      value === null ? '–' : `${String(value)}${suffix?.(ingredient) ?? ''}`
    return [{ label: label(ingredient), from: shown(from), to: shown(to) }]
  })
}
