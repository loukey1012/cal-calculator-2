import { useState, type ReactNode } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { PageHeader } from '../../components/ios/PageHeader'
import { TextField } from '../../components/ios/TextField'
import { toUserMessage } from '../../lib/errors'
import { describeLine } from '../dishes/dishDraft'
import { portionName } from '../dishes/portionName'
import { usePeople } from '../household/hooks'
import { useLookOf } from '../household/usePersonLook'
import { useIngredients } from '../ingredients/hooks'
import { formatKcal } from '../nutrition/format'
import { itemTotals } from '../nutrition/totals'
import { useDeleteRecipe, useRecipes, useSaveRecipe } from './hooks'
import { dishFromRecipe, RECIPE_NAME_MAX, withRecipeName, type Recipe } from './recipeModel'

// day and meal don't matter for showing a recipe
const anyEater = (userId: string) => ({ userId, date: '', mealType: 'snack' as const })

type RecipePageProps = {
  readonly recipeId: string
  /** the bar control above the title, e.g. Back */
  readonly leading: ReactNode
  /** fill Cook with it */
  readonly onCook: (recipe: Recipe) => void
  readonly onDeleted: () => void
}

/** One recipe: what's in it (at current values), cooking it, renaming and deleting it. */
export function RecipePage({ recipeId, leading, onCook, onDeleted }: RecipePageProps) {
  const { householdId } = useCurrentUser()
  const recipes = useRecipes(householdId)
  const recipe = recipes.data?.find((candidate) => candidate.id === recipeId)
  if (recipe) {
    return (
      // a rename on another phone shows its new name in the field
      <RecipeView
        key={recipe.name}
        recipe={recipe}
        leading={leading}
        onCook={onCook}
        onDeleted={onDeleted}
      />
    )
  }
  return (
    <>
      <PageHeader title="Recipe" leading={leading} />
      {recipes.isError ? (
        <ErrorBanner message={toUserMessage(recipes.error)} />
      ) : (
        <p className="mt-6 text-center text-[15px] text-label-secondary">
          {recipes.isPending ? 'Loading…' : 'This recipe was deleted.'}
        </p>
      )}
    </>
  )
}

type RecipeViewProps = Omit<RecipePageProps, 'recipeId'> & { readonly recipe: Recipe }

function RecipeView({ recipe, leading, onCook, onDeleted }: RecipeViewProps) {
  const { profile, householdId } = useCurrentUser()
  const people = usePeople(profile, householdId)
  const lookOf = useLookOf()
  const ingredients = useIngredients(householdId)
  const saveRecipe = useSaveRecipe(householdId)
  const deleteRecipe = useDeleteRecipe(householdId)
  const [name, setName] = useState(recipe.name)
  const [error, setError] = useState<string | null>(null)
  const dish = dishFromRecipe(recipe, ingredients.data ?? [], anyEater)
  const nameOf = (portionId: string) =>
    portionName(dish, people, (person) => lookOf(person).name, portionId)
  const isRenamed = name.trim() !== recipe.name

  function rename() {
    let renamed: Recipe
    try {
      renamed = withRecipeName(recipe, name)
    } catch (failure) {
      return setError(failure instanceof RangeError ? failure.message : toUserMessage(failure))
    }
    setError(null)
    saveRecipe.mutate(renamed, { onError: (failure) => setError(toUserMessage(failure)) })
  }

  function remove() {
    if (!window.confirm(`Delete the recipe “${recipe.name}”? Logged meals stay as they are.`)) {
      return
    }
    setError(null)
    deleteRecipe.mutate(recipe.id, {
      onSuccess: onDeleted,
      onError: (failure) => setError(toUserMessage(failure)),
    })
  }

  return (
    <>
      <PageHeader title={recipe.name} leading={leading} />
      <GroupedSection header="Ingredients">
        {dish.lines.map((line) => (
          <ListRow
            key={line.id}
            title={line.item.name}
            subtitle={describeLine(line, nameOf)}
            detail={`${formatKcal(itemTotals(line.item).kcal)} kcal`}
          />
        ))}
      </GroupedSection>
      <div className="mt-6">
        <Button onClick={() => onCook(recipe)}>Cook this</Button>
      </div>
      <p className="px-4 pt-2 text-[13px] text-label-secondary">
        To change what’s in it, cook it, change it on Cook and update the recipe from there.
      </p>
      <GroupedSection header="Name">
        <TextField
          label="Recipe name"
          value={name}
          maxLength={RECIPE_NAME_MAX}
          autoComplete="off"
          onChange={(event) => setName(event.target.value)}
        />
      </GroupedSection>
      {isRenamed && (
        <div className="mt-3">
          <Button variant="secondary" disabled={saveRecipe.isPending} onClick={rename}>
            Save name
          </Button>
        </div>
      )}
      {error && <ErrorBanner message={error} />}
      <div className="mt-6">
        <Button variant="destructive" disabled={deleteRecipe.isPending} onClick={remove}>
          Delete recipe
        </Button>
      </div>
    </>
  )
}
