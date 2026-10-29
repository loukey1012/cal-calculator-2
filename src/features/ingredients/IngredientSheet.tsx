import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { Sheet } from '../../components/ios/Sheet'
import { toUserMessage } from '../../lib/errors'
import { useMergeByHand } from '../review/hooks'
import { MergeView } from '../review/MergeView'
import { MergeWithPicker } from '../review/MergeWithPicker'
import { BarcodeLink } from '../barcode/BarcodeLink'
import { PrefillNote } from '../barcode/PrefillNote'
import { useProductPrefill } from '../barcode/useProductPrefill'
import {
  useCategories,
  useDeleteIngredient,
  useIngredientUses,
  useIngredients,
  useSaveIngredient,
} from './hooks'
import { clearIngredientDraft, ingredientDraftKey, loadIngredientDraft } from './ingredientDraft'
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
  /** an existing ingredient was saved with changes */
  readonly onUpdated?: (ingredient: Ingredient) => void
  /**
   * merged with another ingredient by hand: the one kept, as it is after the merge, and whether
   * values were taken over from the other one
   */
  readonly onMerged?: (kept: Ingredient, valuesChanged: boolean) => void
}

/** the ingredient picked to merge with: none yet while choosing */
type Merging = { readonly picked: Ingredient | null } | null

export function IngredientSheet({
  open,
  householdId,
  ingredient,
  barcode = null,
  categories,
  groups,
  onClose,
  onOpenIngredient,
  onUpdated,
  onMerged,
}: IngredientSheetProps) {
  const save = useSaveIngredient(householdId)
  const ingredients = useIngredients(householdId)
  const prefill = useProductPrefill(ingredient ? null : barcode, EMPTY_INGREDIENT_FORM)
  const remove = useDeleteIngredient(householdId)
  // bumped to put the form back to the values from Open Food Facts
  const [resets, setResets] = useState(0)
  // what's typed is kept on the phone until saved (one per ingredient, or a new one per barcode)
  const draftKey = ingredient
    ? ingredientDraftKey(householdId, ingredient.id)
    : `${householdId}:new:${barcode ?? ''}`
  const merge = useMergeByHand(householdId)
  const [merging, setMerging] = useState<Merging>(null)
  const uses = useIngredientUses(householdId, merging?.picked != null)
  const allCategories = useCategories(householdId)
  const error = save.error ?? remove.error

  function close() {
    save.reset()
    remove.reset()
    merge.reset()
    setMerging(null)
    onClose()
  }

  function handleDelete() {
    if (!ingredient) return
    const confirmed = window.confirm(
      `Delete “${ingredient.name}”? Meals already logged keep their values.`,
    )
    if (confirmed) remove.mutate(ingredient.id, { onSuccess: close })
  }

  function startMerging() {
    // typed-in changes would be lost: the merge decides the values now
    const hasUnsaved = loadIngredientDraft(draftKey) !== null
    if (hasUnsaved && !window.confirm('Discard your unsaved changes?')) return
    clearIngredientDraft(draftKey)
    setMerging({ picked: null })
  }

  function renderMerging(current: Ingredient, state: NonNullable<Merging>) {
    const { picked } = state
    if (!picked) {
      return (
        <MergeWithPicker
          current={current}
          ingredients={ingredients.data ?? []}
          onPick={(picked) => setMerging({ picked })}
          onBack={() => setMerging(null)}
        />
      )
    }
    return (
      <>
        {merge.error && <ErrorBanner message={toUserMessage(merge.error)} />}
        <MergeView
          key={picked.id}
          pair={[current, picked]}
          categories={allCategories.data ?? categories}
          uses={uses.data ?? {}}
          busy={merge.isPending}
          backLabel="Back"
          onBack={() => setMerging({ picked: null })}
          onMerge={(choice) =>
            merge.mutate(choice, {
              onSuccess: () => {
                const base = choice.keepId === current.id ? current : picked
                onMerged?.({ ...base, ...choice.patch }, Object.keys(choice.patch).length > 0)
                close()
              },
            })
          }
        />
      </>
    )
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={merging ? 'Merge' : ingredient ? 'Edit Ingredient' : 'New Ingredient'}
      action={
        merging ? undefined : (
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
        )
      }
    >
      {ingredient && merging ? (
        renderMerging(ingredient, merging)
      ) : (
        <>
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
                  onReset={() => {
                    clearIngredientDraft(draftKey)
                    setResets((count) => count + 1)
                  }}
                />
              )}
              <IngredientForm
                key={ingredient?.id ?? `new:${barcode ?? ''}:${resets}`}
                formId={FORM_ID}
                draftKey={draftKey}
                editing={ingredient !== null}
                packagePortion={
                  prefill?.status === 'ready' ? (prefill.info?.portion ?? null) : null
                }
                initialValues={
                  ingredient ? toFormValues(ingredient) : (prefill?.values ?? EMPTY_INGREDIENT_FORM)
                }
                categories={categories}
                groups={groups}
                savedIngredients={ingredients.data ?? []}
                onSubmit={(form) =>
                  save.mutate(
                    { id: ingredient?.id ?? null, form, categories },
                    {
                      onSuccess: (saved) => {
                        if (ingredient) onUpdated?.(saved)
                        close()
                      },
                    },
                  )
                }
              />
            </>
          )}
          {error && <ErrorBanner message={toUserMessage(error)} />}
          {ingredient && (
            <div className="mt-6 flex flex-col gap-3">
              <Button
                variant="secondary"
                disabled={save.isPending || remove.isPending}
                onClick={startMerging}
              >
                Merge with…
              </Button>
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
        </>
      )}
    </Sheet>
  )
}
