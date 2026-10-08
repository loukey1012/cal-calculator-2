import { useState } from 'react'
import { BackButton } from '../../components/ios/BackButton'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { Sheet } from '../../components/ios/Sheet'
import { toUserMessage } from '../../lib/errors'
import { confirmDeleteDish } from '../dishes/confirmDelete'
import { lineWho, rescaledLine } from '../dishes/dishDraft'
import { DishEditor } from '../dishes/DishEditor'
import { useDeleteDish, useDish, useLatestDishChangeError, useSaveDish } from '../dishes/hooks'
import type { Dish } from '../dishes/portions'
import { AmountEditor } from './AmountEditor'
import { itemsByMeal, mealLabel, scaleItemAmount, type MealItem, type MealType } from './dayModel'
import { useDay, useDeleteMealItem, useLatestDayChangeError, useUpdateMealItem } from './hooks'
import { MealItemsView } from './MealItemsView'
import { previewChangedItem } from './preview'

/** Items are looked up live by id, so a partner's change or delete is noticed. */
type View =
  | { readonly kind: 'items' }
  /** a plain item, logged before the Cook tab */
  | { readonly kind: 'edit'; readonly itemId: string }
  /** a single food logged alone: its amount, changed through its dish */
  | { readonly kind: 'food'; readonly itemId: string; readonly dishId: string }
  | { readonly kind: 'dish'; readonly dishId: string }

type MealSheetProps = {
  readonly open: boolean
  readonly mealType: MealType
  readonly userId: string
  /** local YYYY-MM-DD */
  readonly date: string
  readonly onClose: () => void
  /** an empty meal: open Cook for it */
  readonly onCook: () => void
}

/** A meal of a day: what was eaten, to look at, change or remove. Food is added on Cook. */
export function MealSheet({ open, mealType, userId, date, onClose, onCook }: MealSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={mealLabel(mealType)}>
      <MealSheetContent mealType={mealType} userId={userId} date={date} onCook={onCook} />
    </Sheet>
  )
}

/**
 * The item an open editor shows. Saving a dish re-creates its items with new ids, so a single
 * food is also found by its dish: its editor stays open when its own save comes back.
 */
function editedItemOf(view: View, items: readonly MealItem[]): MealItem | undefined {
  if (view.kind !== 'edit' && view.kind !== 'food') return undefined
  const byId = items.find((candidate) => candidate.id === view.itemId)
  if (byId || view.kind !== 'food') return byId
  return items.find((candidate) => candidate.dish?.id === view.dishId)
}

function MealSheetContent({
  mealType,
  userId,
  date,
  onCook,
}: Omit<MealSheetProps, 'open' | 'onClose'>) {
  const [requestedView, setView] = useState<View>({ kind: 'items' })
  const day = useDay(userId, date)
  const update = useUpdateMealItem(userId, date)
  const remove = useDeleteMealItem(userId, date)
  const deleteDish = useDeleteDish()
  const latestChangeError = useLatestDayChangeError(userId, date)
  const latestDishError = useLatestDishChangeError()
  const items = itemsByMeal(day.data ?? [])[mealType]
  const editedItem = editedItemOf(requestedView, items)
  // an item deleted meanwhile (e.g. by a partner) sends the editor back to the list
  const view: View =
    (requestedView.kind === 'edit' || requestedView.kind === 'food') && !editedItem
      ? { kind: 'items' }
      : requestedView
  const label = mealLabel(mealType)
  const showItems = () => setView({ kind: 'items' })

  function removeDish(dishId: string, portionCount: number | undefined) {
    if (!confirmDeleteDish(portionCount)) return
    deleteDish.remove(dishId)
    showItems()
  }

  switch (view.kind) {
    case 'items':
      return (
        <MealItemsView
          items={items}
          loading={day.isPending}
          error={latestChangeError ?? latestDishError ?? day.error}
          onEdit={(item) => setView({ kind: 'edit', itemId: item.id })}
          onDelete={(itemId) => remove.mutate(itemId)}
          onEditFood={(item, dishId) => setView({ kind: 'food', itemId: item.id, dishId })}
          onEditDish={(dishId) => setView({ kind: 'dish', dishId })}
          onDeleteDish={removeDish}
          onCook={onCook}
        />
      )
    case 'dish':
      return (
        // its own Back: one step at a time, from the dish back to the meal
        <DishEditor dishId={view.dishId} date={date} onDone={showItems} />
      )
    case 'food':
      if (!editedItem) return null
      return (
        <>
          <BackButton onClick={showItems} />
          <FoodEditor
            item={editedItem}
            dishId={view.dishId}
            label={label}
            onDone={showItems}
            onEditDish={() => setView({ kind: 'dish', dishId: view.dishId })}
            onRemove={() => removeDish(view.dishId, editedItem.dish?.portionCount)}
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

/** The new amount of a food logged alone; its one-line dish is saved with it. */
function withFoodAmount(dish: Dish, amount: number): Dish {
  const [line] = dish.lines
  const [portion] = dish.portions
  if (!line || !portion) throw new RangeError('This food can’t be changed here.')
  const changed =
    lineWho(line).kind === 'shared'
      ? rescaledLine(line, { allocation: 'shared', amount })
      : rescaledLine(line, { allocation: 'per_portion', amounts: { [portion.id]: amount } })
  return { ...dish, lines: [changed] }
}

type FoodEditorProps = {
  readonly item: MealItem
  readonly dishId: string
  readonly label: string
  readonly onDone: () => void
  /** the whole dish: who eats, name, leftovers */
  readonly onEditDish: () => void
  readonly onRemove: () => void
}

function FoodEditor({ item, dishId, label, onDone, onEditDish, onRemove }: FoodEditorProps) {
  const dish = useDish(dishId)
  const saveDish = useSaveDish()
  const [error, setError] = useState<string | null>(null)

  if (dish.isError) return <ErrorBanner message={toUserMessage(dish.error)} />
  if (dish.isPending || dish.data === null) {
    return (
      <p className="mt-6 text-center text-[15px] text-label-secondary">
        {dish.isPending ? 'Loading…' : 'This food was deleted.'}
      </p>
    )
  }
  const loaded = dish.data
  return (
    <>
      <AmountEditor
        title={item.name}
        units={[item.entered_unit]}
        initialAmount={String(item.entered_amount)}
        confirmLabel="Save"
        preview={(amount) => previewChangedItem(item, amount)}
        onConfirm={(amount) => {
          try {
            saveDish.save({ dish: withFoodAmount(loaded, amount) })
            onDone()
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'This food can’t be changed.')
          }
        }}
        secondaryAction={
          <div className="flex flex-col gap-3">
            <Button variant="secondary" onClick={onEditDish}>
              Edit dish
            </Button>
            <Button variant="destructive" onClick={onRemove}>
              Remove from {label}
            </Button>
          </div>
        }
      />
      {error && <ErrorBanner message={error} />}
    </>
  )
}
