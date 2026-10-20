import { useState } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { TextField } from '../../components/ios/TextField'
import { toUserMessage } from '../../lib/errors'
import { newId } from '../dishes/dishDraft'
import { useSaveRecipe } from './hooks'
import { RECIPE_NAME_MAX, type Recipe } from './recipeModel'

type SaveRecipeFormProps = {
  readonly initialName: string
  /** the recipe this food came from: it can be updated instead of saved as a new one */
  readonly existing: Recipe | null
  /** the recipe to save under this name and id; throws a RangeError with a readable message */
  readonly build: (name: string, id: string) => Recipe
  readonly onSaved: (recipe: Recipe) => void
}

/** Names a recipe and saves it; stays open with the reason when saving fails (e.g. offline). */
export function SaveRecipeForm({ initialName, existing, build, onSaved }: SaveRecipeFormProps) {
  const { householdId } = useCurrentUser()
  const saveRecipe = useSaveRecipe(householdId)
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)

  function save(id: string) {
    let recipe: Recipe
    try {
      recipe = build(name, id)
    } catch (failure) {
      return setError(failure instanceof RangeError ? failure.message : toUserMessage(failure))
    }
    setError(null)
    saveRecipe.mutate(recipe, {
      onSuccess: () => onSaved(recipe),
      onError: (failure) => setError(toUserMessage(failure)),
    })
  }

  return (
    <>
      <GroupedSection header="Recipe">
        <TextField
          label="Recipe name"
          value={name}
          maxLength={RECIPE_NAME_MAX}
          autoComplete="off"
          onChange={(event) => setName(event.target.value)}
        />
      </GroupedSection>
      <p className="px-4 pt-2 text-[13px] text-label-secondary">
        Shared with your household. Cooking it uses the ingredients’ current values.
      </p>
      {error && <ErrorBanner message={error} />}
      <div className="mt-6 flex flex-col gap-3">
        {existing ? (
          <>
            <Button disabled={saveRecipe.isPending} onClick={() => save(existing.id)}>
              Update “{existing.name}”
            </Button>
            <Button
              variant="secondary"
              disabled={saveRecipe.isPending}
              onClick={() => save(newId())}
            >
              Save as new recipe
            </Button>
          </>
        ) : (
          <Button disabled={saveRecipe.isPending} onClick={() => save(newId())}>
            Save recipe
          </Button>
        )}
      </div>
    </>
  )
}
