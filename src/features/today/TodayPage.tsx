import { useState } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { PageHeader } from '../../components/ios/PageHeader'
import { fromLocalDateString } from '../../lib/dates'
import { toUserMessage } from '../../lib/errors'
import { itemsByMeal, MEAL_TYPES, type MealType } from '../meals/dayModel'
import { useDay, useLatestDayChangeError } from '../meals/hooks'
import { MealSheet } from '../meals/MealSheet'
import { formatKcal, macroSummary } from '../nutrition/format'
import { mealTotals, sumTotals } from '../nutrition/totals'
import { useToday } from './useToday'

const DATE_FORMAT: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }

function mealSubtitle(loading: boolean, count: number): string {
  if (loading) return 'Loading…'
  if (count === 0) return 'Nothing logged'
  return count === 1 ? '1 item' : `${count} items`
}

export function TodayPage() {
  const { profile } = useCurrentUser()
  const today = useToday()
  const day = useDay(profile.id, today)
  // the sheet belongs to the day it was opened on, so it closes when the day rolls over
  const [openMeal, setOpenMeal] = useState<{ type: MealType; date: string } | null>(null)
  const openMealType = openMeal?.date === today ? openMeal.type : null
  // reported here too, so a save that fails after the sheet was closed isn't silent
  const latestChangeError = useLatestDayChangeError(profile.id, today)

  const byMeal = itemsByMeal(day.data ?? [])
  const meals = MEAL_TYPES.map(({ type, label }) => ({
    type,
    label,
    count: byMeal[type].length,
    totals: mealTotals(byMeal[type]),
  }))
  const dayTotals = sumTotals(meals.map((meal) => meal.totals))
  const dateLabel = new Intl.DateTimeFormat(undefined, DATE_FORMAT).format(
    fromLocalDateString(today),
  )

  return (
    <>
      <PageHeader title="Today" subtitle={dateLabel} />
      {latestChangeError && openMealType === null && (
        <ErrorBanner
          message={`Couldn’t save your last change. ${toUserMessage(latestChangeError)}`}
        />
      )}
      {day.isError ? (
        <>
          <ErrorBanner message={toUserMessage(day.error)} />
          <div className="mt-4">
            <Button onClick={() => void day.refetch()}>Try again</Button>
          </div>
        </>
      ) : (
        <>
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
                subtitle={mealSubtitle(day.isPending, count)}
                detail={count > 0 ? `${formatKcal(totals.kcal)} kcal` : undefined}
                onClick={() => setOpenMeal({ type, date: today })}
              />
            ))}
          </GroupedSection>
        </>
      )}
      <MealSheet
        open={openMealType !== null}
        mealType={openMealType ?? 'breakfast'}
        userId={profile.id}
        date={today}
        onClose={() => setOpenMeal(null)}
      />
    </>
  )
}
