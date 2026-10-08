import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { formatKcalTotal, macroSummary } from '../nutrition/format'
import { mealTotals } from '../nutrition/totals'
import { portionItems, type Dish, type PortionItems } from './portions'

type DishTotalsProps = {
  readonly dish: Dish
  readonly nameOf: (portionId: string) => string
}

function splitOrError(dish: Dish): readonly PortionItems[] | string {
  try {
    return portionItems(dish)
  } catch (error) {
    return error instanceof Error ? error.message : 'This split doesn’t work.'
  }
}

/** What everyone gets, live while editing. */
export function DishTotals({ dish, nameOf }: DishTotalsProps) {
  const split = splitOrError(dish)
  if (typeof split === 'string') return <ErrorBanner message={split} />
  return (
    <div data-testid="dish-totals">
      <GroupedSection header="Per portion">
        {split.map(({ portionId, items }) => {
          const totals = {
            ...mealTotals(items.map(({ draft }) => draft)),
            estimated: dish.kcalEstimated ?? false,
          }
          return (
            <ListRow
              key={portionId}
              title={nameOf(portionId)}
              subtitle={macroSummary(totals)}
              detail={`${formatKcalTotal(totals)} kcal`}
            />
          )
        })}
      </GroupedSection>
    </div>
  )
}
