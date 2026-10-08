import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { ListRow } from '../../components/ios/ListRow'
import { DinnerIcon } from '../../components/ios/icons'
import { describeAmount, ESTIMATE_LABEL, type DishRef, type MealItem } from '../meals/dayModel'
import { formatKcalTotal } from '../nutrition/format'
import { itemTotals, mealTotals } from '../nutrition/totals'
import { autoTitle } from './dishTitle'

type DishBlockProps = {
  /** one person's portion: the items of one dish in this meal */
  readonly items: readonly MealItem[]
  readonly onEdit: (dishId: string) => void
}

function ingredientCount(count: number): string {
  return count === 1 ? '1 ingredient' : `${count} ingredients`
}

/** e.g. "Estimate · Shared · 3 ingredients" */
function blockSubtitle(dish: DishRef | null, count: number): string {
  const eaterCount = dish?.eaterCount
  return [
    ...(dish?.kcalEstimated ? [ESTIMATE_LABEL] : []),
    ...(eaterCount !== undefined && eaterCount > 1 ? ['Shared'] : []),
    ingredientCount(count),
  ].join(' · ')
}

/** A dish in a meal: one row with this person's share, opening to its ingredients. */
export function DishBlock({ items, onEdit }: DishBlockProps) {
  const [open, setOpen] = useState(false)
  const dish = items.find((item) => item.dish)?.dish ?? null
  const totals = mealTotals(items)

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left active:bg-fill"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-ink">
          <DinnerIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-semibold">
            {dish?.name ?? autoTitle(items.map((item) => item.name))}
          </span>
          <span className="block truncate text-[13px] font-medium text-label-secondary">
            {blockSubtitle(dish, items.length)}
          </span>
        </span>
        <span className="shrink-0 text-[15px] font-semibold text-label-secondary">
          {formatKcalTotal(totals)} kcal
        </span>
      </button>
      {open && (
        <div className="bg-fill/40 pb-2">
          {items.map((item) => (
            <ListRow
              key={item.id}
              title={item.name}
              subtitle={describeAmount(item)}
              detail={`${formatKcalTotal(itemTotals(item))} kcal`}
            />
          ))}
          {dish && (
            <div className="px-2">
              <Button variant="plain" onClick={() => onEdit(dish.id)}>
                Edit dish
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
