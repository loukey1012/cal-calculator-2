import { useNavigate } from 'react-router'
import { useCurrentUser } from '../../app/currentUser'
import { BackButton } from '../../components/ios/BackButton'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { useIngredients } from '../ingredients/hooks'
import { useRecipes } from '../recipes/hooks'
import { RecipePage } from '../recipes/RecipePage'
import { RecipesList } from '../recipes/RecipesList'
import type { Recipe } from '../recipes/recipeModel'
import { hasContent, withRecipe } from './cookDraft'
import { useCookSession } from './cookSessionContext'
import { COOK_PATH } from './cookSteps'
import { recipePath, RECIPES_PATH, type RecipePageRef } from './recipePages'

const REPLACE_QUESTION =
  'Replace the meal on Cook with this recipe? What’s entered there is removed.'

/** Like the Cook steps, recipe pages build no browser history: Back and a back swipe pop them. */
function useGo(): (path: string) => void {
  const navigate = useNavigate()
  return (path) => void navigate(path, { replace: true })
}

/** The Recipes row on Cook, above the dish. */
export function RecipesRow() {
  const { householdId } = useCurrentUser()
  const recipes = useRecipes(householdId)
  const go = useGo()
  return (
    <GroupedSection>
      <ListRow
        title="Recipes"
        detail={recipes.data && recipes.data.length > 0 ? String(recipes.data.length) : undefined}
        onClick={() => go(RECIPES_PATH)}
      />
    </GroupedSection>
  )
}

/** The recipe list and a recipe, as pages of the Cook tab; cooking one fills the Cook draft. */
export function CookRecipePages({ page }: { readonly page: RecipePageRef }) {
  const { householdId } = useCurrentUser()
  const ingredients = useIngredients(householdId)
  const { draft, setDraft } = useCookSession()
  const go = useGo()

  function cook(recipe: Recipe) {
    if (hasContent(draft) && !window.confirm(REPLACE_QUESTION)) return
    setDraft(withRecipe(draft, recipe, ingredients.data ?? []))
    go(COOK_PATH)
  }

  if (page.kind === 'list') {
    return (
      <RecipesList
        leading={<BackButton onClick={() => go(COOK_PATH)} />}
        onOpen={(recipeId) => go(recipePath(recipeId))}
      />
    )
  }
  return (
    <RecipePage
      recipeId={page.recipeId}
      leading={<BackButton onClick={() => go(RECIPES_PATH)} />}
      onCook={cook}
      onDeleted={() => go(RECIPES_PATH)}
    />
  )
}
