import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { Sheet } from '../../components/ios/Sheet'
import type { Ingredient } from '../ingredients/ingredientsApi'
import { availableUnits } from '../nutrition/amounts'
import {
  buildMealItem,
  ingredientNutrition,
  type MealItemSource,
} from '../nutrition/fromIngredient'
import type { AmountUnit } from '../nutrition/types'
import { AmountEditor } from './AmountEditor'
import { CustomItemForm } from './CustomItemForm'
import { itemsByMeal, mealLabel, scaleItemAmount, type MealType } from './dayModel'
import { FoodPicker } from './FoodPicker'
import {
  newMealItemId,
  useAddMealItem,
  useDay,
  useDeleteMealItem,
  useLatestDayChangeError,
  useUpdateMealItem,
} from './hooks'
import { MealItemsView } from './MealItemsView'
import { previewChangedItem, previewNewItem } from './preview'

type View =
  | { readonly kind: 'items' }
  | { readonly kind: 'pick' }
  | { readonly kind: 'amount'; readonly ingredient: Ingredient }
  | { readonly kind: 'custom' }
  /** by id: the item is looked up live, so a partner's change or delete is noticed */
  | { readonly kind: 'edit'; readonly itemId: string }

type MealSheetProps = {
  readonly open: boolean
  readonly mealType: MealType
  readonly userId: string
  /** local YYYY-MM-DD */
  readonly date: string
  readonly onClose: () => void
}

export function MealSheet({ open, mealType, userId, date, onClose }: MealSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={mealLabel(mealType)}>
      <MealSheetContent mealType={mealType} userId={userId} date={date} />
    </Sheet>
  )
}

function BackButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <Button variant="plain" aria-label="Back" className="-ml-2" onClick={onClick}>
      ‹ Back
    </Button>
  )
}

function sourceOf(ingredient: Ingredient): MealItemSource {
  return {
    ingredientId: ingredient.id,
    name: ingredient.name,
    brand: ingredient.brand,
    nutrition: ingredientNutrition(ingredient),
  }
}

function MealSheetContent({ mealType, userId, date }: Omit<MealSheetProps, 'open' | 'onClose'>) {
  const [requestedView, setView] = useState<View>({ kind: 'items' })
  const day = useDay(userId, date)
  const add = useAddMealItem(userId, date)
  const update = useUpdateMealItem(userId, date)
  const remove = useDeleteMealItem(userId, date)
  const latestChangeError = useLatestDayChangeError(userId, date)
  const items = itemsByMeal(day.data ?? [])[mealType]
  const editedItem =
    requestedView.kind === 'edit'
      ? items.find((candidate) => candidate.id === requestedView.itemId)
      : undefined
  // an item deleted meanwhile (e.g. by a partner) sends the editor back to the list
  const view: View =
    requestedView.kind === 'edit' && !editedItem ? { kind: 'items' } : requestedView
  const label = mealLabel(mealType)
  const showItems = () => setView({ kind: 'items' })

  function addItem(source: MealItemSource, amount: number, unit: AmountUnit) {
    add.mutate({ id: newMealItemId(), mealType, draft: buildMealItem(source, amount, unit) })
    showItems()
  }

  switch (view.kind) {
    case 'items':
      return (
        <MealItemsView
          items={items}
          loading={day.isPending}
          error={latestChangeError ?? day.error}
          onAdd={() => setView({ kind: 'pick' })}
          onEdit={(item) => setView({ kind: 'edit', itemId: item.id })}
          onDelete={(itemId) => remove.mutate(itemId)}
        />
      )
    case 'pick':
      return (
        <>
          <BackButton onClick={showItems} />
          <FoodPicker
            onPick={(ingredient) => setView({ kind: 'amount', ingredient })}
            onCustom={() => setView({ kind: 'custom' })}
          />
        </>
      )
    case 'amount': {
      const nutrition = ingredientNutrition(view.ingredient)
      return (
        <>
          <BackButton onClick={() => setView({ kind: 'pick' })} />
          <AmountEditor
            title={view.ingredient.name}
            units={availableUnits(nutrition)}
            unitLabel={view.ingredient.unit_label}
            confirmLabel={`Add to ${label}`}
            preview={(amount, unit) => previewNewItem(nutrition, amount, unit)}
            onConfirm={(amount, unit) => addItem(sourceOf(view.ingredient), amount, unit)}
          />
        </>
      )
    }
    case 'custom':
      return (
        <>
          <BackButton onClick={() => setView({ kind: 'pick' })} />
          <CustomItemForm
            confirmLabel={`Add to ${label}`}
            onConfirm={({ source, amount, unit }) => addItem(source, amount, unit)}
          />
        </>
      )
    case 'edit': {
      if (!editedItem) return null
      const item = editedItem
      return (
        <>
          <BackButton onClick={showItems} />
          <AmountEditor
            title={item.name}
            units={[item.entered_unit]}
            initialAmount={String(item.entered_amount)}
            confirmLabel="Save"
            preview={(amount) => previewChangedItem(item, amount)}
            onConfirm={(amount) => {
              update.mutate({ id: item.id, patch: scaleItemAmount(item, amount) })
              showItems()
            }}
            secondaryAction={
              <Button
                variant="destructive"
                onClick={() => {
                  remove.mutate(item.id)
                  showItems()
                }}
              >
                Remove from {label}
              </Button>
            }
          />
        </>
      )
    }
  }
}
