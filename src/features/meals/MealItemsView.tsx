import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { ListRow } from '../../components/ios/ListRow'
import { SwipeableRow } from '../../components/ios/SwipeableRow'
import { toUserMessage } from '../../lib/errors'
import { DishBlock } from '../dishes/DishBlock'
import { formatKcalTotal, macroSummary } from '../nutrition/format'
import { itemTotals, mealTotals } from '../nutrition/totals'
import { describeAmount, ESTIMATE_LABEL, mealEntries, type MealItem } from './dayModel'

type MealItemsViewProps = {
  readonly items: readonly MealItem[]
  readonly loading: boolean
  readonly error: Error | null
  /** a plain item */
  readonly onEdit: (item: MealItem) => void
  readonly onDelete: (itemId: string) => void
  /** a single food logged alone */
  readonly onEditFood: (item: MealItem, dishId: string) => void
  readonly onEditDish: (dishId: string) => void
  /** asks first when the dish has more portions */
  readonly onDeleteDish: (dishId: string, portionCount: number | undefined) => void
  /** opens Cook for this meal */
  readonly onCook: () => void
}

function FoodRow({ item, onClick }: { readonly item: MealItem; readonly onClick: () => void }) {
  return (
    <ListRow
      title={item.name}
      subtitle={
        item.dish?.kcalEstimated
          ? `${ESTIMATE_LABEL} · ${describeAmount(item)}`
          : describeAmount(item)
      }
      detail={`${formatKcalTotal(itemTotals(item))} kcal`}
      onClick={onClick}
    />
  )
}

export function MealItemsView({
  items,
  loading,
  error,
  onEdit,
  onDelete,
  onEditFood,
  onEditDish,
  onDeleteDish,
  onCook,
}: MealItemsViewProps) {
  const totals = mealTotals(items)

  return (
    <>
      <p data-testid="meal-total" className="text-[15px] text-label-secondary">
        <span className="font-semibold text-label">{formatKcalTotal(totals)} kcal</span>
        {' · '}
        {macroSummary(totals)}
      </p>
      {error && <ErrorBanner message={toUserMessage(error)} />}
      {items.length === 0 && !loading && (
        <div className="mt-6 text-center text-[15px] text-label-secondary">
          <p>Nothing logged yet.</p>
          <p className="mt-1 text-[13px]">Meals are added on the Cook tab.</p>
          <div className="mt-4">
            <Button variant="secondary" onClick={onCook}>
              Add on Cook
            </Button>
          </div>
        </div>
      )}
      {items.length > 0 && (
        <div className="mt-4 divide-y divide-separator overflow-hidden rounded-3xl bg-bg-elevated shadow-card">
          {mealEntries(items).map((entry) => {
            switch (entry.kind) {
              case 'item':
                return (
                  <SwipeableRow key={entry.item.id} onDelete={() => onDelete(entry.item.id)}>
                    <FoodRow item={entry.item} onClick={() => onEdit(entry.item)} />
                  </SwipeableRow>
                )
              case 'food':
                return (
                  <SwipeableRow
                    key={entry.item.id}
                    onDelete={() => onDeleteDish(entry.dishId, entry.item.dish?.portionCount)}
                  >
                    <FoodRow
                      item={entry.item}
                      onClick={() => onEditFood(entry.item, entry.dishId)}
                    />
                  </SwipeableRow>
                )
              case 'dish': {
                const dish = entry.items.find((item) => item.dish)?.dish
                // a dish's items only change through the dish
                const block = <DishBlock items={entry.items} onEdit={onEditDish} />
                return dish ? (
                  <SwipeableRow
                    key={entry.portionId}
                    onDelete={() => onDeleteDish(dish.id, dish.portionCount)}
                  >
                    {block}
                  </SwipeableRow>
                ) : (
                  <div key={entry.portionId}>{block}</div>
                )
              }
            }
          })}
        </div>
      )}
    </>
  )
}
