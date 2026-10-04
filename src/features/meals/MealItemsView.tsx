import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { ListRow } from '../../components/ios/ListRow'
import { SwipeableRow } from '../../components/ios/SwipeableRow'
import { toUserMessage } from '../../lib/errors'
import { formatKcal, macroSummary } from '../nutrition/format'
import { itemTotals, mealTotals } from '../nutrition/totals'
import { describeAmount, type MealItem } from './dayModel'

type MealItemsViewProps = {
  readonly items: readonly MealItem[]
  readonly loading: boolean
  readonly error: Error | null
  readonly onAdd: () => void
  readonly onEdit: (item: MealItem) => void
  readonly onDelete: (itemId: string) => void
}

export function MealItemsView({
  items,
  loading,
  error,
  onAdd,
  onEdit,
  onDelete,
}: MealItemsViewProps) {
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
          {items.map((item) => (
            <SwipeableRow key={item.id} onDelete={() => onDelete(item.id)}>
              <ListRow
                title={item.name}
                subtitle={describeAmount(item)}
                detail={`${formatKcal(itemTotals(item).kcal)} kcal`}
                onClick={() => onEdit(item)}
              />
            </SwipeableRow>
          ))}
        </div>
      )}
      <div className="mt-6">
        <Button onClick={onAdd}>Add food</Button>
      </div>
    </>
  )
}
