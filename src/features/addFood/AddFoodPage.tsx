import { useRef, useState } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { useStackNavigate } from '../../app/stackNavigate'
import { BackButton } from '../../components/ios/BackButton'
import { Button } from '../../components/ios/Button'
import { PageHeader } from '../../components/ios/PageHeader'
import { Sheet } from '../../components/ios/Sheet'
import { ComposerBar } from '../dishes/ComposerBar'
import { DishComposer } from '../dishes/DishComposer'
import { useSaveDish } from '../dishes/hooks'
import { portionName } from '../dishes/portionName'
import { saveError, toWeighError } from '../dishes/saveError'
import { useMembers, usePeople } from '../household/hooks'
import { useLookOf } from '../household/usePersonLook'
import { useRecipes, useSaveRecipe } from '../recipes/hooks'
import { learnedRecipe } from '../recipes/recipeLearning'
import {
  linkedRecipeFromDish,
  withRecipeName,
  type Recipe,
  type RecipeLink,
} from '../recipes/recipeModel'
import { SaveRecipeForm } from '../recipes/SaveRecipeForm'
import { mealLabel } from '../meals/dayModel'
import { foodPath, mealPath, type MealPageRef } from '../meals/mealPages'
import { useToday } from '../today/useToday'
import { hasContent, keepEaters, resolvedDish, withDish, type AddFoodDraft } from './addFoodDraft'
import { useAddFoodSession } from './addFoodSessionContext'
import { WhoEats } from './WhoEats'
import { RecipeChoices } from './RecipeChoices'
import { useAddFoodSteps } from './useAddFoodSteps'
import { useMealOfDay } from './useMealOfDay'

const DISCARD_QUESTION = 'Discard this meal? Everything entered so far is removed.'

/**
 * A meal's Add food, the one place food is logged: alone or together, cooked or a single food.
 * Each step of adding an ingredient (search, amount) is a page of its own below it.
 */
export function AddFoodPage({ page }: { readonly page: MealPageRef }) {
  const { profile, householdId } = useCurrentUser()
  const members = useMembers(householdId)
  const people = usePeople(profile, householdId)
  const lookOf = useLookOf()
  const today = useToday()
  const mealOfDay = useMealOfDay()
  const navigate = useStackNavigate()
  const saveDish = useSaveDish()
  const { draft: storedDraft, setDraft, reset } = useAddFoodSession()
  const steps = useAddFoodSteps(foodPath(page.mealPath))
  const backToMeal = () => navigate(page.mealPath)
  const recipes = useRecipes(householdId)
  const saveRecipe = useSaveRecipe(householdId)
  const [error, setError] = useState<string | null>(null)
  const [isSavingRecipe, setIsSavingRecipe] = useState(false)
  // the link of the recipe just saved from this dish, so cooking on keeps teaching it
  const savedLink = useRef<RecipeLink | null>(null)

  // someone who left the household can't eat along any more
  const memberIds = members.data && [profile.id, ...members.data.map((member) => member.id)]
  const draft = memberIds ? keepEaters(storedDraft, memberIds, profile.id) : storedDraft

  const change = (next: AddFoodDraft) => {
    setDraft(next)
    setError(null)
  }
  const nameOf = (portionId: string) =>
    portionName(draft.dish, people, (person) => lookOf(person).name, portionId)

  const fromRecipe = recipes.data?.find((recipe) => recipe.id === draft.recipe?.recipeId) ?? null

  /** Updating the recipe it came from teaches it this dish; anything else is a new recipe. */
  function recipeToSave(name: string, id: string): Recipe {
    const linked =
      fromRecipe && draft.recipe && id === fromRecipe.id
        ? learnedRecipe(fromRecipe, draft.recipe, draft.dish)
        : linkedRecipeFromDish(draft.dish, name, id)
    savedLink.current = linked.link
    return withRecipeName(linked.recipe, name)
  }

  function save() {
    const dish = resolvedDish(draft, today, mealOfDay)
    const problem = saveError(dish)
    if (problem) return setError(problem)
    try {
      saveDish.save({ dish })
    } catch (failure) {
      return setError(failure instanceof Error ? failure.message : 'This meal can’t be saved.')
    }
    // the recipe learns what was cooked (best effort: offline it learns next time)
    if (fromRecipe && draft.recipe) {
      saveRecipe.mutate(learnedRecipe(fromRecipe, draft.recipe, dish).recipe)
    }
    reset()
    setError(null)
    // to the meal it was logged in, seen from the same tab (it may have been changed here)
    const [eater] = dish.portions.flatMap((portion) => (portion.eater ? [portion.eater] : []))
    const shown = dish.portions.some((portion) => portion.eater?.userId === page.meal.userId)
    const saved = eater && { ...eater, userId: shown ? page.meal.userId : eater.userId }
    const from = page.mealPath.startsWith('/history') ? 'history' : 'today'
    navigate(saved ? mealPath(saved, from) : page.mealPath, saved && { person: saved.userId })
  }

  function saveAsRecipe() {
    const problem = toWeighError(draft.dish)
    if (problem) return setError(problem)
    setIsSavingRecipe(true)
  }

  function discard() {
    if (!window.confirm(DISCARD_QUESTION)) return
    reset()
    setError(null)
    backToMeal()
  }

  const onDish = steps.step.kind === 'main'
  return (
    <>
      {onDish ? (
        <PageHeader
          title="Add food"
          leading={<BackButton label={mealLabel(page.meal.mealType)} onClick={backToMeal} />}
        />
      ) : (
        <div className="pt-3 pb-2">
          <ComposerBar steps={steps} onBack={steps.back} />
        </div>
      )}
      <DishComposer
        // a fresh draft starts the form over
        key={draft.dish.id}
        dish={draft.dish}
        onChange={(dish) => change(withDish(draft, dish))}
        nameOf={nameOf}
        error={error}
        steps={steps}
        allowWeighLater
        header={
          <>
            <WhoEats draft={draft} people={people} onChange={change} />
            <RecipeChoices draft={draft} onChange={change} />
          </>
        }
        actions={
          <>
            <Button onClick={save}>Save meal</Button>
            {draft.dish.lines.length > 0 && (
              <Button variant="secondary" onClick={saveAsRecipe}>
                Save as recipe
              </Button>
            )}
            {hasContent(draft) && (
              <Button variant="destructive" onClick={discard}>
                Discard
              </Button>
            )}
          </>
        }
      />
      <Sheet open={isSavingRecipe} onClose={() => setIsSavingRecipe(false)} title="Save as recipe">
        <SaveRecipeForm
          initialName={fromRecipe?.name ?? draft.dish.name ?? ''}
          existing={fromRecipe}
          build={recipeToSave}
          onSaved={() => {
            setIsSavingRecipe(false)
            // cooking on (and logging it) keeps teaching this recipe
            setDraft((current) => ({ ...current, recipe: savedLink.current }))
          }}
        />
      </Sheet>
    </>
  )
}
