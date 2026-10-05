import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { ListRow } from '../../components/ios/ListRow'
import { SwipeableRow } from '../../components/ios/SwipeableRow'
import { toUserMessage } from '../../lib/errors'
import { DishBlock } from '../dishes/DishBlock'
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
  readonly onCookTogether: () => void
  readonly onEditDish: (dishId: string) => void
}

type Entry =
  | { readonly kind: 'item'; readonly item: MealItem }
  | { readonly kind: 'dish'; readonly portionId: string; readonly items: readonly MealItem[] }

/** Plain items as they are; a dish's items as one entry, where its first item was. */
function entriesOf(items: readonly MealItem[]): Entry[] {
  return items.flatMap((item): Entry[] => {
    const portionId = item.dish_portion_id
    if (portionId === null) return [{ kind: 'item', item }]
    const first = items.find((candidate) => candidate.dish_portion_id === portionId)
    if (first !== item) return []
    const portion = items.filter((candidate) => candidate.dish_portion_id === portionId)
    return [{ kind: 'dish', portionId, items: portion }]
  })
}

export function MealItemsView({
  items,
  loading,
  error,
  onAdd,
  onEdit,
  onDelete,
  onCookTogether,
  onEditDish,
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
          {entriesOf(items).map((entry) =>
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
      </div>
    </>
  )
}
