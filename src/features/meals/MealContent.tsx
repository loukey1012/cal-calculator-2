import { useState, type ReactNode } from 'react'
import { BackButton } from '../../components/ios/BackButton'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { toUserMessage } from '../../lib/errors'
import { confirmDeleteDish } from '../dishes/confirmDelete'
import { lineWho, rescaledLine } from '../dishes/dishDraft'
import { DishEditor } from '../dishes/DishEditor'
import { useDeleteDish, useDish, useLatestDishChangeError, useSaveDish } from '../dishes/hooks'
import type { Dish } from '../dishes/portions'
import { MealRecipeForm } from '../recipes/MealRecipeForm'
import { AmountEditor } from './AmountEditor'
import { CopyMealForm } from './CopyMealForm'
import { itemsByMeal, mealLabel, scaleItemAmount, type MealItem, type MealType } from './dayModel'
import { useDay, useDeleteMealItem, useLatestDayChangeError, useUpdateMealItem } from './hooks'
import { MealItemsView } from './MealItemsView'
import { useMoveEntries } from './moveMeal'
import { previewChangedItem } from './preview'

/** Items are looked up live by id, so a partner's change or delete is noticed. */
type View =
  | { readonly kind: 'items' }
  /** a plain item, logged before the Cook tab */
  | { readonly kind: 'edit'; readonly itemId: string }
  /** a single food logged alone: its amount, changed through its dish */
  | { readonly kind: 'food'; readonly itemId: string; readonly dishId: string }
  | { readonly kind: 'dish'; readonly dishId: string }
  | { readonly kind: 'saveRecipe' }
  | { readonly kind: 'copy' }
  /** the whole meal (null), or the items of one dish or food */
  | { readonly kind: 'move'; readonly itemIds: readonly string[] | null }

type MealContentProps = {
  readonly mealType: MealType
  readonly userId: string
  /** local YYYY-MM-DD */
  readonly date: string
  /** below the list of what was eaten, e.g. Add food */
  readonly actions?: ReactNode
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

/** What was eaten at a meal, to look at, change or remove, each change in a view of its own. */
export function MealContent({ mealType, userId, date, actions }: MealContentProps) {
  const [requestedView, setView] = useState<View>({ kind: 'items' })
  // e.g. "Copied to Lunch, …", shown above the list after going back to it
  const [notice, setNotice] = useState<string | null>(null)
  const day = useDay(userId, date)
  const update = useUpdateMealItem(userId, date)
  const remove = useDeleteMealItem(userId, date)
  const deleteDish = useDeleteDish()
  const move = useMoveEntries(userId, date)
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
  const showItemsWith = (message: string) => {
    setNotice(message)
    showItems()
  }
  const open = (next: View) => {
    setNotice(null)
    setView(next)
  }

  function removeDish(dishId: string, portionCount: number | undefined) {
    if (!confirmDeleteDish(portionCount)) return
    deleteDish.remove(dishId)
    showItems()
  }

  switch (view.kind) {
    case 'items':
      return (
        <MealItemsView
          notice={notice}
          items={items}
          loading={day.isPending}
          error={latestChangeError ?? latestDishError ?? day.error}
          onEdit={(item) => setView({ kind: 'edit', itemId: item.id })}
          onDelete={(itemId) => remove.mutate(itemId)}
          onEditFood={(item, dishId) => setView({ kind: 'food', itemId: item.id, dishId })}
          onEditDish={(dishId) => setView({ kind: 'dish', dishId })}
          onDeleteDish={removeDish}
          actions={actions}
          onSaveRecipe={() => open({ kind: 'saveRecipe' })}
          onCopy={() => open({ kind: 'copy' })}
          onMove={() => open({ kind: 'move', itemIds: null })}
        />
      )
    case 'saveRecipe':
      return (
        <>
          <BackButton onClick={showItems} />
          <MealRecipeForm
            items={items}
            userId={userId}
            onSaved={() => showItemsWith('Saved as a recipe. Find it under Ingredients › Recipes.')}
          />
        </>
      )
    case 'copy':
      return (
        <>
          <BackButton onClick={showItems} />
          <CopyMealForm
            items={items}
            userId={userId}
            mealType={mealType}
            onCopied={showItemsWith}
          />
        </>
      )
    case 'move': {
      const ids = view.itemIds
      const moved = ids ? items.filter((item) => ids.includes(item.id)) : items
      return (
        <>
          <BackButton onClick={showItems} />
          <CopyMealForm
            items={moved}
            userId={userId}
            mealType={mealType}
            date={date}
            move={(eater) => move(moved, eater)}
            onCopied={showItemsWith}
          />
        </>
      )
    }
    case 'dish':
      return (
        // its own Back: one step at a time, from the dish back to the meal
        <DishEditor
          dishId={view.dishId}
          date={date}
          onDone={showItems}
          onMove={() => open({ kind: 'move', itemIds: itemIdsOfDish(items, view.dishId) })}
        />
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
            onMove={() => open({ kind: 'move', itemIds: itemIdsOfDish(items, view.dishId) })}
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
  /** to another meal, day or person */
  readonly onMove: () => void
  readonly onRemove: () => void
}

function FoodEditor({
  item,
  dishId,
  label,
  onDone,
  onEditDish,
  onMove,
  onRemove,
}: FoodEditorProps) {
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
            <Button variant="secondary" onClick={onMove}>
              Move to…
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

/** This meal's items of one dish (its portion here). */
function itemIdsOfDish(items: readonly MealItem[], dishId: string): string[] {
  return items.filter((item) => item.dish?.id === dishId).map((item) => item.id)
}
