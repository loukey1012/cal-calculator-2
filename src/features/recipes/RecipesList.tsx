import type { ReactNode } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { EmptyState } from '../../components/ios/EmptyState'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { PageHeader } from '../../components/ios/PageHeader'
import { toUserMessage } from '../../lib/errors'
import { useIngredients } from '../ingredients/hooks'
import { formatKcal } from '../nutrition/format'
import { useRecipes } from './hooks'
import { recipeKcal } from './recipeCooking'

function ingredientCount(count: number): string {
  return count === 1 ? '1 ingredient' : `${count} ingredients`
}

/** The household's recipes; tapping one opens it. */
type RecipesListProps = {
  /** the bar control above the title, e.g. Back; null: no title (it sits under another one) */
  readonly leading: ReactNode | null
  readonly onOpen: (recipeId: string) => void
}

export function RecipesList({ leading, onOpen }: RecipesListProps) {
  const { householdId } = useCurrentUser()
  const recipes = useRecipes(householdId)
  const ingredients = useIngredients(householdId)

  return (
    <>
      {leading !== null && <PageHeader title="Recipes" leading={leading} />}
      {recipes.isError && <ErrorBanner message={toUserMessage(recipes.error)} />}
      {recipes.isPending && (
        <p className="mt-6 text-center text-[15px] text-label-secondary">Loading…</p>
      )}
      {recipes.data?.length === 0 && (
        <EmptyState
          title="No recipes yet"
          message="Save a dish you add, or a logged meal, as a recipe to cook it again."
        />
      )}
      {recipes.data && recipes.data.length > 0 && (
        <GroupedSection>
          {recipes.data.map((recipe) => (
            <ListRow
              key={recipe.id}
              title={recipe.name}
              subtitle={ingredientCount(recipe.slots.length)}
              detail={`${formatKcal(recipeKcal(recipe, ingredients.data ?? []))} kcal`}
              onClick={() => onOpen(recipe.id)}
            />
          ))}
        </GroupedSection>
      )}
    </>
  )
}
