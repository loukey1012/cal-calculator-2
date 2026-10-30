import type { Ingredient } from '../ingredients/ingredientsApi'
import { duplicateOf } from './merge'
import type { Finding } from './reviewApi'
import { describeChanges, suggestionPatch } from './suggestion'

const isChangedAfter = (ingredient: Ingredient, finding: Finding) =>
  Date.parse(ingredient.updated_at) > Date.parse(finding.created_at)

/**
 * False only when it is cheap to see that the user has fixed the finding themselves: the
 * ingredient was changed after the finding and its suggested fix is already in, or its duplicate
 * is gone. Anything unclear stays — a values finding without a fix may flag what no local check
 * sees, so only the weekly review withdraws those. Meal findings (no ingredient) are never hidden.
 */
export function findingStillApplies(
  finding: Finding,
  ingredient: Ingredient | undefined,
  byId: ReadonlyMap<string, Ingredient>,
): boolean {
  if (finding.ingredient_id === null || !ingredient) return true
  if (!isChangedAfter(ingredient, finding)) return true

  const patch = suggestionPatch(finding.suggestion)
  const hasFix = patch !== null && Object.keys(patch).length > 0
  if (hasFix) return describeChanges(ingredient, patch).length > 0

  if (finding.kind === 'duplicate') {
    const otherId = duplicateOf(finding.suggestion)
    return otherId === null || byId.has(otherId)
  }
  return true
}
