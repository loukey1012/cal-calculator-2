import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { Sheet } from '../../components/ios/Sheet'
import { toUserMessage } from '../../lib/errors'
import { useDeleteIngredient, useSaveIngredient } from './hooks'
import { IngredientForm } from './IngredientForm'
import { EMPTY_INGREDIENT_FORM, toFormValues } from './ingredientForm'
import type { Category, CategoryGroup, Ingredient } from './ingredientsApi'

const FORM_ID = 'ingredient-form'

type IngredientSheetProps = {
  readonly open: boolean
  readonly householdId: string
  /** null adds a new ingredient */
  readonly ingredient: Ingredient | null
  readonly categories: readonly Category[]
  /** broad categories a new category can be put into */
  readonly groups: readonly CategoryGroup[]
  readonly onClose: () => void
}

export function IngredientSheet({
  open,
  householdId,
  ingredient,
  categories,
  groups,
  onClose,
}: IngredientSheetProps) {
  const save = useSaveIngredient(householdId)
  const remove = useDeleteIngredient(householdId)
  const error = save.error ?? remove.error

  function close() {
    save.reset()
    remove.reset()
    onClose()
  }

  function handleDelete() {
    if (!ingredient) return
    const confirmed = window.confirm(
      `Delete “${ingredient.name}”? Meals already logged keep their values.`,
    )
    if (confirmed) remove.mutate(ingredient.id, { onSuccess: close })
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={ingredient ? 'Edit Ingredient' : 'New Ingredient'}
      action={
        <Button
          variant="plain"
          type="submit"
          form={FORM_ID}
          loading={save.isPending}
          disabled={remove.isPending}
          className="-mr-2 font-semibold"
        >
          Save
        </Button>
      }
    >
      <IngredientForm
        key={ingredient?.id ?? 'new'}
        formId={FORM_ID}
        initialValues={ingredient ? toFormValues(ingredient) : EMPTY_INGREDIENT_FORM}
        categories={categories}
        groups={groups}
        onSubmit={(form) =>
          save.mutate({ id: ingredient?.id ?? null, form, categories }, { onSuccess: close })
        }
      />
      {error && <ErrorBanner message={toUserMessage(error)} />}
      {ingredient && (
        <div className="mt-6">
          <Button
            variant="destructive"
            loading={remove.isPending}
            disabled={save.isPending}
            onClick={handleDelete}
          >
            Delete Ingredient
          </Button>
        </div>
      )}
    </Sheet>
  )
}
