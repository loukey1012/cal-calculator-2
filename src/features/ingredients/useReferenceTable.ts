import { useCurrentUser } from '../../app/currentUser'
import { useGoals } from '../goals/hooks'
import { goalForDate } from '../nutrition/goals'
import { useToday } from '../today/useToday'
import type { Ingredient } from './ingredientsApi'
import { referenceTable, trackedNutrients, type ReferenceTable } from './referenceValues'

/** The ingredient's values for the nutrients of your own goal today (calories only without one). */
export function useReferenceTable(ingredient: Ingredient | undefined): ReferenceTable | undefined {
  const { profile } = useCurrentUser()
  const goals = useGoals(profile.id)
  const today = useToday()
  if (!ingredient) return undefined
  const nutrients = trackedNutrients(goalForDate(goals.data ?? [], today))
  return referenceTable(ingredient, nutrients) ?? undefined
}
