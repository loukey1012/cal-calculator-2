import { useState, type ReactNode } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { BackButton } from '../../components/ios/BackButton'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { PageHeader } from '../../components/ios/PageHeader'
import { TextField } from '../../components/ios/TextField'
import { toUserMessage } from '../../lib/errors'
import { describeLine } from '../dishes/dishDraft'
import { usePeople } from '../household/hooks'
import { useLookOf } from '../household/usePersonLook'
import { useIngredients } from '../ingredients/hooks'
import { formatKcal } from '../nutrition/format'
import { itemTotals } from '../nutrition/totals'
import { useDeleteRecipe, useRecipes, useSaveRecipe } from './hooks'
import { currentItem } from './recipeCooking'
import {
  choiceLabel,
  pickedChoice,
  RECIPE_NAME_MAX,
  withRecipeName,
  type Recipe,
  type RecipeSlot,
} from './recipeModel'
import { RecipeSlotEditor } from './RecipeSlotEditor'

/** e.g. "Toastbrot (Clever) or Toastbrot (Spar)" */
function slotTitle(slot: RecipeSlot): string {
  return slot.choices.map(choiceLabel).join(' or ')
}

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
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null)
  const editingSlot = recipe.slots.find((slot) => slot.id === editingSlotId)
  const nameOf = (portionId: string) => {
    const userId = recipe.portions.find((portion) => portion.id === portionId)?.userId
    const person = people.find((candidate) => candidate.id === userId)
    return person ? lookOf(person).name : 'Leftover'
  }
  const isRenamed = name.trim() !== recipe.name

  function save(changed: Recipe) {
    setError(null)
    saveRecipe.mutate(changed, { onError: (failure) => setError(toUserMessage(failure)) })
  }

  function rename() {
    let renamed: Recipe
    try {
      renamed = withRecipeName(recipe, name)
    } catch (failure) {
      return setError(failure instanceof RangeError ? failure.message : toUserMessage(failure))
    }
    save(renamed)
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

  if (editingSlot) {
    return (
      <>
        <PageHeader
          title={pickedChoice(editingSlot).item.name}
          leading={<BackButton onClick={() => setEditingSlotId(null)} />}
        />
        <RecipeSlotEditor
          recipe={recipe}
          slot={editingSlot}
          ingredients={ingredients.data ?? []}
          nameOf={nameOf}
          onChange={save}
        />
        {error && <ErrorBanner message={error} />}
      </>
    )
  }

  return (
    <>
      <PageHeader title={recipe.name} leading={leading} />
      <GroupedSection header="Ingredients">
        {recipe.slots.map((slot) => {
          const picked = pickedChoice(slot)
          return (
            <ListRow
              key={slot.id}
              title={slotTitle(slot)}
              subtitle={`${describeLine(picked, nameOf)}${slot.optional ? ' · optional' : ''}`}
              detail={`${formatKcal(itemTotals(currentItem(picked.item, ingredients.data ?? [])).kcal)} kcal`}
              onClick={() => setEditingSlotId(slot.id)}
            />
          )
        })}
      </GroupedSection>
      <div className="mt-6">
        <Button onClick={() => onCook(recipe)}>Cook this</Button>
      </div>
      <p className="px-4 pt-2 text-[13px] text-label-secondary">
        Cooking it learns: products you swap in become choices, ingredients you leave out become
        optional.
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
