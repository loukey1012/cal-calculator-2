import { useCurrentUser } from '../../app/currentUser'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { toUserMessage } from '../../lib/errors'
import { PrefillNote } from '../barcode/PrefillNote'
import { useProductPrefill } from '../barcode/useProductPrefill'
import { useCategories, useCategoryGroups, useSaveIngredient } from './hooks'
import { IngredientForm } from './IngredientForm'
import { EMPTY_INGREDIENT_FORM } from './ingredientForm'
import type { Ingredient } from './ingredientsApi'

const FORM_ID = 'new-ingredient-form'

type NewIngredientFormProps = {
  /** e.g. what was searched for */
  readonly initialName: string
  /** a scanned barcode: the form is filled in from Open Food Facts where possible */
  readonly barcode?: string | null
  readonly onSaved: (ingredient: Ingredient) => void
}

/** Adds an ingredient to the shared database without leaving the current step, e.g. on Cook. */
export function NewIngredientForm({
  initialName,
  barcode = null,
  onSaved,
}: NewIngredientFormProps) {
  const { householdId } = useCurrentUser()
  const categories = useCategories(householdId)
  const groups = useCategoryGroups(householdId)
  const save = useSaveIngredient(householdId)
  const typed = { ...EMPTY_INGREDIENT_FORM, name: initialName.trim() }
  const prefill = useProductPrefill(barcode, typed)

  if (prefill?.status === 'loading') {
    return (
      <p role="status" className="mt-6 text-center text-[15px] text-label-secondary">
        Looking up the product…
      </p>
    )
  }
  // the pickers need their lists, or the category would show "None" when it is set
  if (categories.isPending || groups.isPending) {
    return <p className="mt-6 text-center text-[15px] text-label-secondary">Loading…</p>
  }
  const categoryList = categories.data ?? []
  return (
    <>
      <h3 className="mb-2 text-[20px] font-semibold">New ingredient</h3>
      {prefill && <PrefillNote text={prefill.note} />}
      <IngredientForm
        formId={FORM_ID}
        initialValues={prefill?.values ?? typed}
        categories={categoryList}
        groups={groups.data ?? []}
        onSubmit={(form) =>
          save.mutate({ id: null, form, categories: categoryList }, { onSuccess: onSaved })
        }
      />
      {save.error && <ErrorBanner message={toUserMessage(save.error)} />}
      <div className="mt-6">
        <Button type="submit" form={FORM_ID} loading={save.isPending}>
          Save ingredient
        </Button>
      </div>
    </>
  )
}
