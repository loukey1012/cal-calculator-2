import { describe, expect, test } from 'vitest'
import { applyCorrections, CORRECTIONS, type Correction } from './corrections.ts'
import type { ImportedIngredient } from './transform.ts'

const ALMOND: ImportedIngredient = {
  legacy_id: 'almond',
  name: 'Almond',
  brand: 'Magnum',
  note: null,
  categoryName: 'Snacks',
  kcal_100: 336,
  protein_100: 4.7,
  kcal_unit: 219,
  protein_unit: 3.9,
  unit_weight_g: 83,
  created_at: null,
}
const OIL: ImportedIngredient = { ...ALMOND, legacy_id: 'oil', name: 'Öl', categoryName: null }

describe('applyCorrections', () => {
  test('overrides only the listed fields of the matching food and reports each change', () => {
    // Arrange
    const corrections: readonly Correction[] = [
      { legacyId: 'almond', changes: { kcal_100: 333, kcal_unit: 276 } },
    ]

    // Act
    const result = applyCorrections([ALMOND, OIL], corrections)

    // Assert
    expect(result.ingredients).toEqual([{ ...ALMOND, kcal_100: 333, kcal_unit: 276 }, OIL])
    expect(result.applied).toEqual([
      { legacyId: 'almond', name: 'Almond', field: 'kcal_100', from: 336, to: 333 },
      { legacyId: 'almond', name: 'Almond', field: 'kcal_unit', from: 219, to: 276 },
    ])
    expect(result.unmatched).toEqual([])
  })

  test('does not mutate the input', () => {
    const input = [ALMOND]
    applyCorrections(input, [{ legacyId: 'almond', changes: { kcal_100: 333 } }])
    expect(input[0]).toBe(ALMOND)
    expect(ALMOND.kcal_100).toBe(336)
  })

  test('lists corrections whose food is not in the import', () => {
    const result = applyCorrections([OIL], [{ legacyId: 'gone', changes: { note: 'x' } }])
    expect(result.ingredients).toEqual([OIL])
    expect(result.unmatched).toEqual(['gone'])
  })

  test('the known corrections never leave a category that is merged away', () => {
    const merged = CORRECTIONS.flatMap((correction) =>
      correction.changes.categoryName === undefined ? [] : [correction.changes.categoryName],
    )
    expect(merged).not.toContain('Meat')
    expect(merged).toEqual(expect.arrayContaining(['Meat & Fish', 'Ingredients']))
  })
})
