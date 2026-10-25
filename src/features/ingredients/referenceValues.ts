import { formatGrams, formatKcal } from '../nutrition/format'
import type { Goal, RingKey } from '../nutrition/goals'
import { measureOf } from '../nutrition/unitNames'
import type { Ingredient } from './ingredientsApi'

/** An ingredient's values per 100 g (or ml) and per unit, for the nutrients one keeps track of. */
export type ReferenceTable = {
  readonly nutrients: readonly RingKey[]
  readonly rows: readonly ReferenceRow[]
}

/** e.g. { basis: "1 bar", values: ["210", "18.0"] }; "–" where the label has no value */
export type ReferenceRow = { readonly basis: string; readonly values: readonly string[] }

type Basis = '100' | 'unit'

const DEFAULT_UNIT_LABEL = 'unit'
/** shown where the label has no value */
export const MISSING_VALUE = '–'

// the order of the goal rings
const TARGETS: ReadonlyArray<readonly [Exclude<RingKey, 'kcal'>, keyof Goal]> = [
  ['protein', 'proteinG'],
  ['carbs', 'carbsG'],
  ['fat', 'fatG'],
  ['fiber', 'fiberG'],
]

/** Calories always; protein, carbs, fat and fiber when the goal has a target for them. */
export function trackedNutrients(goal: Goal | null): readonly RingKey[] {
  const targeted = TARGETS.filter(([, field]) => goal?.[field] != null).map(([key]) => key)
  return ['kcal', ...targeted]
}

function basisLabel(ingredient: Ingredient, basis: Basis): string {
  return basis === '100'
    ? `100 ${measureOf(ingredient)}`
    : `1 ${ingredient.unit_label ?? DEFAULT_UNIT_LABEL}`
}

function valueText(ingredient: Ingredient, key: RingKey, basis: Basis, locale?: string): string {
  const value = ingredient[`${key}_${basis}`]
  if (value === null) return MISSING_VALUE
  if (key !== 'kcal') return formatGrams(value, locale)
  return `${ingredient.kcal_estimated ? '~' : ''}${formatKcal(value, locale)}`
}

/** One row per basis the ingredient has calories for; null when it has none. */
export function referenceTable(
  ingredient: Ingredient,
  nutrients: readonly RingKey[],
  locale?: string,
): ReferenceTable | null {
  const bases: readonly Basis[] = ['100', 'unit']
  const rows = bases
    .filter((basis) => ingredient[`kcal_${basis}`] !== null)
    .map((basis) => ({
      basis: basisLabel(ingredient, basis),
      values: nutrients.map((key) => valueText(ingredient, key, basis, locale)),
    }))
  return rows.length === 0 ? null : { nutrients, rows }
}
