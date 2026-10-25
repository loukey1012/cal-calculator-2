import { useCurrentUser } from '../../app/currentUser'
import { useStackNavigate } from '../../app/stackNavigate'
import { BackButton } from '../../components/ios/BackButton'
import { useIngredients } from '../ingredients/hooks'
import { foodPath, recipesPath, type MealPageRef } from '../meals/mealPages'
import { RecipePage } from '../recipes/RecipePage'
import { RecipesList } from '../recipes/RecipesList'
import type { Recipe } from '../recipes/recipeModel'
import { hasContent, withRecipe } from './addFoodDraft'
import { useAddFoodSession } from './addFoodSessionContext'
import { recipePageOf, recipePath } from './recipePages'

const REPLACE_QUESTION = 'Replace the dish you started with this recipe? What’s entered is removed.'

/** A meal's Add from recipe: the list, then a recipe; cooking one fills Add food for the meal. */
export function AddFromRecipePages({ page }: { readonly page: MealPageRef }) {
  const { householdId } = useCurrentUser()
  const ingredients = useIngredients(householdId)
  const { draft, setDraft } = useAddFoodSession()
  const go = useStackNavigate()
  const base = recipesPath(page.mealPath)
  const shown = recipePageOf(`${base}/${page.rest.join('/')}`, base) ?? { kind: 'list' }

  function cook(recipe: Recipe) {
    if (hasContent(draft) && !window.confirm(REPLACE_QUESTION)) return
    setDraft(withRecipe(draft, recipe, ingredients.data ?? []))
    go(foodPath(page.mealPath))
  }

  if (shown.kind === 'list') {
    return (
      <RecipesList
        leading={<BackButton onClick={() => go(page.mealPath)} />}
        onOpen={(recipeId) => go(recipePath(base, recipeId))}
      />
    )
  }
  return (
    <RecipePage
      recipeId={shown.recipeId}
      leading={<BackButton onClick={() => go(base)} />}
      onCook={cook}
      onDeleted={() => go(base)}
    />
  )
}
