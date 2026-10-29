import { useCurrentUser } from '../../app/currentUser'
import { DietMarks } from '../../components/ios/dietSymbols'
import { dietOf } from './dietOf'
import { useIngredientsById } from './hooks'

type ItemsDietMarksProps = {
  /** the ingredient of every item; null for a custom item (no mark possible) */
  readonly ingredientIds: ReadonlyArray<string | null>
}

/**
 * The diet marks of a dish or meal, read from the household's ingredients: a mark only when
 * every ingredient has it.
 */
export function ItemsDietMarks({ ingredientIds }: ItemsDietMarksProps) {
  const { householdId } = useCurrentUser()
  const { vegan, halal } = dietOf(ingredientIds, useIngredientsById(householdId))
  return <DietMarks vegan={vegan} halal={halal} />
}
