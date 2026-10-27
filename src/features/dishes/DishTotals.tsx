import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { formatKcalTotal, macroSummary } from '../nutrition/format'
import { mealTotals, sumTotals } from '../nutrition/totals'
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
  const estimated = dish.kcalEstimated ?? false
  const portionTotals = split.map(({ portionId, items }) => ({
    portionId,
    totals: { ...mealTotals(items.map(({ draft }) => draft)), estimated },
  }))
  const whole = { ...sumTotals(portionTotals.map(({ totals }) => totals)), estimated }
  return (
    <div data-testid="dish-totals">
      <GroupedSection header="Per portion" region>
        {portionTotals.map(({ portionId, totals }) => (
          <ListRow
            key={portionId}
            title={nameOf(portionId)}
            subtitle={macroSummary(totals)}
            detail={`${formatKcalTotal(totals)} kcal`}
          />
        ))}
      </GroupedSection>
      {portionTotals.length > 1 && (
        <GroupedSection header="Whole dish" region>
          <ListRow
            title="All portions"
            subtitle={macroSummary(whole)}
            detail={`${formatKcalTotal(whole)} kcal`}
          />
        </GroupedSection>
      )}
    </div>
  )
}
