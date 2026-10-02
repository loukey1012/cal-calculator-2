import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { toUserMessage } from '../../lib/errors'
import { displayName } from '../household/hooks'
import type { Profile } from '../household/householdApi'
import { itemsByMeal, MEAL_TYPES, type MealType } from '../meals/dayModel'
import { useDay, useLatestDayChangeError } from '../meals/hooks'
import { MealSheet } from '../meals/MealSheet'
import { formatKcal, macroSummary } from '../nutrition/format'
import { mealTotals, sumTotals } from '../nutrition/totals'
import { GoalCard } from './GoalCard'

function mealSubtitle(loading: boolean, offline: boolean, count: number): string {
  if (loading) return offline ? 'Offline – not loaded yet' : 'Loading…'
  if (count === 0) return 'Nothing logged'
  return count === 1 ? '1 item' : `${count} items`
}

type DayViewProps = {
  readonly person: Profile
  readonly isOwnDay: boolean
  /** local YYYY-MM-DD; today or any past day, all editable */
  readonly date: string
}

/** A person's day: goal rings, total and the four meals, each opening an editable meal sheet. */
export function DayView({ person, isOwnDay, date }: DayViewProps) {
  const day = useDay(person.id, date)
  // the sheet belongs to the day it was opened on, so it closes when the day rolls over
  const [openMeal, setOpenMeal] = useState<{ type: MealType; date: string } | null>(null)
  const openMealType = openMeal?.date === date ? openMeal.type : null
  // reported here too, so a save that fails after the sheet was closed isn't silent
  const latestChangeError = useLatestDayChangeError(person.id, date)

  const byMeal = itemsByMeal(day.data ?? [])
  const meals = MEAL_TYPES.map(({ type, label }) => ({
    type,
    label,
    count: byMeal[type].length,
    totals: mealTotals(byMeal[type]),
  }))
  const dayTotals = sumTotals(meals.map((meal) => meal.totals))

  return (
    <>
      {latestChangeError && openMealType === null && (
        <ErrorBanner
          message={`Couldn’t save your last change. ${toUserMessage(latestChangeError)}`}
        />
      )}
      {day.isError && day.data === undefined ? (
        <>
          <ErrorBanner message={toUserMessage(day.error)} />
          <div className="mt-4">
            <Button onClick={() => void day.refetch()}>Try again</Button>
          </div>
        </>
      ) : (
        <>
          <GoalCard
            key={person.id}
            userId={person.id}
            isOwnGoal={isOwnDay}
            name={displayName(person)}
            date={date}
            totals={dayTotals}
          />
          <GroupedSection>
            <div data-testid="day-total">
              <ListRow
                title="Total"
                subtitle={day.isPending ? 'Loading…' : macroSummary(dayTotals)}
                detail={day.isPending ? undefined : `${formatKcal(dayTotals.kcal)} kcal`}
              />
            </div>
          </GroupedSection>
          <GroupedSection header="Meals">
            {meals.map(({ type, label, count, totals }) => (
              <ListRow
                key={type}
                title={label}
                subtitle={mealSubtitle(day.isPending, day.fetchStatus === 'paused', count)}
                detail={count > 0 ? `${formatKcal(totals.kcal)} kcal` : undefined}
                onClick={() => setOpenMeal({ type, date })}
              />
            ))}
          </GroupedSection>
        </>
      )}
      <MealSheet
        open={openMealType !== null}
        mealType={openMealType ?? 'breakfast'}
        userId={person.id}
        date={date}
        onClose={() => setOpenMeal(null)}
      />
    </>
  )
}
