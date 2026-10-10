import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { Sheet } from '../../components/ios/Sheet'
import { toUserMessage } from '../../lib/errors'
import { BarcodeLink } from '../barcode/BarcodeLink'
import { PrefillNote } from '../barcode/PrefillNote'
import { useProductPrefill } from '../barcode/useProductPrefill'
import { useDeleteIngredient, useIngredients, useSaveIngredient } from './hooks'
import { IngredientForm } from './IngredientForm'
import { EMPTY_INGREDIENT_FORM, toFormValues } from './ingredientForm'
import type { Category, CategoryGroup, Ingredient } from './ingredientsApi'

const FORM_ID = 'ingredient-form'

type IngredientSheetProps = {
  readonly open: boolean
  readonly householdId: string
  /** null adds a new ingredient */
  readonly ingredient: Ingredient | null
  /** for a new ingredient: a scanned barcode, filled in from Open Food Facts where possible */
  readonly barcode?: string | null
  readonly categories: readonly Category[]
  /** broad categories a new category can be put into */
  readonly groups: readonly CategoryGroup[]
  readonly onClose: () => void
  /** the scanned barcode was added to this existing ingredient: show it instead */
  readonly onOpenIngredient: (ingredient: Ingredient) => void
}

export function IngredientSheet({
  open,
  householdId,
  ingredient,
  barcode = null,
  categories,
  groups,
  onClose,
  onOpenIngredient,
}: IngredientSheetProps) {
  const save = useSaveIngredient(householdId)
  const ingredients = useIngredients(householdId)
  const prefill = useProductPrefill(ingredient ? null : barcode, EMPTY_INGREDIENT_FORM)
  const remove = useDeleteIngredient(householdId)
  // bumped to put the form back to the values from Open Food Facts
  const [resets, setResets] = useState(0)
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
      {prefill?.status === 'loading' ? (
        <p role="status" className="mt-6 text-center text-[15px] text-label-secondary">
          Looking up the product…
        </p>
      ) : (
        <>
          {prefill?.status === 'ready' && barcode && (
            <BarcodeLink
              barcode={barcode}
              productName={prefill.info ? prefill.values.name : ''}
              productBrand={prefill.values.brand}
              onLinked={onOpenIngredient}
            />
          )}
          {prefill && (
            <PrefillNote
              text={prefill.note}
              warnings={prefill.warnings}
              info={prefill.info}
              onReset={() => setResets((count) => count + 1)}
            />
          )}
          <IngredientForm
            key={ingredient?.id ?? `new:${barcode ?? ''}:${resets}`}
            formId={FORM_ID}
            editing={ingredient !== null}
            packagePortion={prefill?.status === 'ready' ? (prefill.info?.portion ?? null) : null}
            initialValues={
              ingredient ? toFormValues(ingredient) : (prefill?.values ?? EMPTY_INGREDIENT_FORM)
            }
            categories={categories}
            groups={groups}
            savedIngredients={ingredients.data ?? []}
            onSubmit={(form) =>
              save.mutate({ id: ingredient?.id ?? null, form, categories }, { onSuccess: close })
            }
          />
        </>
      )}
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
