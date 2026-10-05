// Fixes for known errors in the Firebase source data, applied on import (Firebase stays unchanged).
// Each correction targets one food by its Firebase document id and overrides only the listed fields.
import type { ImportedIngredient } from './transform.ts'

type CorrectableField = Exclude<keyof ImportedIngredient, 'legacy_id' | 'created_at'>

export type Correction = {
  readonly legacyId: string
  readonly changes: Partial<Pick<ImportedIngredient, CorrectableField>>
}

export type AppliedChange = {
  readonly legacyId: string
  readonly name: string
  readonly field: string
  readonly from: unknown
  readonly to: unknown
}

export type CorrectionResult = {
  readonly ingredients: readonly ImportedIngredient[]
  readonly applied: readonly AppliedChange[]
  /** corrections whose food was not imported */
  readonly unmatched: readonly string[]
}

// confirmed by the user on 2026-10-05
export const CORRECTIONS: readonly Correction[] = [
  // "Meat" (only this food) is merged into "Meat & Fish"
  { legacyId: '5df293a4-e32a-4e96-99d1-da18134b60df', changes: { categoryName: 'Meat & Fish' } },
  // Öl had no category
  { legacyId: '3c6d7c6b-0393-4b55-8dc5-dd88a993e4ef', changes: { categoryName: 'Ingredients' } },
  // McFlurry Lotus Schoko Sauce: 2.125 was entered in units of 100 g
  { legacyId: 'AvUQY5Xh0NwFj19jWuox', changes: { unit_weight_g: 212 } },
  // Pasta Snack Käse Sahne Sauce: 71 g is right, but it needs explaining
  {
    legacyId: '60187afd-f862-4b23-9716-3b0cce3a3473',
    changes: {
      note: 'Unit weight is the dry powder (71 g); per-100 g values are for the prepared dish.',
    },
  },
  // Magnum Almond: values from the packaging
  { legacyId: 'zI6O3ykh1BzYytb878K3', changes: { kcal_100: 333, kcal_unit: 276 } },
]

function correct(ingredient: ImportedIngredient, correction: Correction) {
  const applied = Object.entries(correction.changes).map(([field, to]) => ({
    legacyId: ingredient.legacy_id,
    name: ingredient.name,
    field,
    from: ingredient[field as CorrectableField],
    to,
  }))
  return { ingredient: { ...ingredient, ...correction.changes }, applied }
}

export function applyCorrections(
  ingredients: readonly ImportedIngredient[],
  corrections: readonly Correction[],
): CorrectionResult {
  const byId = new Map(corrections.map((correction) => [correction.legacyId, correction]))
  const results = ingredients.map((ingredient) => {
    const correction = byId.get(ingredient.legacy_id)
    return correction ? correct(ingredient, correction) : { ingredient, applied: [] }
  })
  const imported = new Set(ingredients.map((ingredient) => ingredient.legacy_id))
  return {
    ingredients: results.map((result) => result.ingredient),
    applied: results.flatMap((result) => result.applied),
    unmatched: corrections
      .map((correction) => correction.legacyId)
      .filter((legacyId) => !imported.has(legacyId)),
  }
}
