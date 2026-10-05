import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { ListRow } from '../../components/ios/ListRow'
import { SwipeableRow } from '../../components/ios/SwipeableRow'
import { toUserMessage } from '../../lib/errors'
import { DishBlock } from '../dishes/DishBlock'
import { formatKcal, macroSummary } from '../nutrition/format'
import { itemTotals, mealTotals } from '../nutrition/totals'
import { describeAmount, mealEntries, type MealItem } from './dayModel'

type MealItemsViewProps = {
  readonly items: readonly MealItem[]
  readonly loading: boolean
  readonly error: Error | null
  readonly onAdd: () => void
  readonly onEdit: (item: MealItem) => void
  readonly onDelete: (itemId: string) => void
  readonly onCookTogether: () => void
  /** "share this meal": shown when the meal has plain items */
  readonly onShare: () => void
  readonly onEditDish: (dishId: string) => void
}

export function MealItemsView({
  items,
  loading,
  error,
  onAdd,
  onEdit,
  onDelete,
  onCookTogether,
  onShare,
  onEditDish,
}: MealItemsViewProps) {
  const hasPlainItems = items.some((item) => item.dish_portion_id === null)
  const totals = mealTotals(items)

  return (
    <>
      <p data-testid="meal-total" className="text-[15px] text-label-secondary">
        <span className="font-semibold text-label">{formatKcal(totals.kcal)} kcal</span>
        {' · '}
        {macroSummary(totals)}
      </p>
      {error && <ErrorBanner message={toUserMessage(error)} />}
      {items.length === 0 && !loading && (
        <p className="mt-6 text-center text-[15px] text-label-secondary">Nothing logged yet.</p>
      )}
      {items.length > 0 && (
        <div className="mt-4 divide-y divide-separator overflow-hidden rounded-3xl bg-bg-elevated shadow-card">
          {mealEntries(items).map((entry) =>
            entry.kind === 'dish' ? (
              // a dish's items only change through the dish
              <DishBlock key={entry.portionId} items={entry.items} onEdit={onEditDish} />
            ) : (
              <SwipeableRow key={entry.item.id} onDelete={() => onDelete(entry.item.id)}>
                <ListRow
                  title={entry.item.name}
                  subtitle={describeAmount(entry.item)}
                  detail={`${formatKcal(itemTotals(entry.item).kcal)} kcal`}
                  onClick={() => onEdit(entry.item)}
                />
              </SwipeableRow>
            ),
          )}
        </div>
      )}
      <div className="mt-6 flex flex-col gap-3">
        <Button onClick={onAdd}>Add food</Button>
        <Button variant="secondary" onClick={onCookTogether}>
          Cook together
        </Button>
        {hasPlainItems && (
          <Button variant="secondary" onClick={onShare}>
            Share this meal
          </Button>
        )}
      </div>
    </>
  )
}
