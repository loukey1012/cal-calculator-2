import { useState } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { PageHeader } from '../../components/ios/PageHeader'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { fromLocalDateString } from '../../lib/dates'
import { toUserMessage } from '../../lib/errors'
import { useMembers } from '../household/hooks'
import type { Profile } from '../household/householdApi'
import { itemsByMeal, MEAL_TYPES, type MealType } from '../meals/dayModel'
import { useDay, useLatestDayChangeError } from '../meals/hooks'
import { MealSheet } from '../meals/MealSheet'
import { formatKcal, macroSummary } from '../nutrition/format'
import { mealTotals, sumTotals } from '../nutrition/totals'
import { GoalCard } from './GoalCard'
import { useToday } from './useToday'

const DATE_FORMAT: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }

function mealSubtitle(loading: boolean, offline: boolean, count: number): string {
  if (loading) return offline ? 'Offline – not loaded yet' : 'Loading…'
  if (count === 0) return 'Nothing logged'
  return count === 1 ? '1 item' : `${count} items`
}

function displayName(member: Profile): string {
  return member.display_name || 'Unnamed'
}

/** You first, then the other household members. */
function peopleInOrder(members: readonly Profile[], me: Profile): readonly Profile[] {
  return [me, ...members.filter((member) => member.id !== me.id)]
}

export function TodayPage() {
  const { profile, householdId } = useCurrentUser()
  const today = useToday()
  const members = useMembers(householdId)
  const people = peopleInOrder(members.data ?? [], profile)
  const [selectedId, setSelectedId] = useState(profile.id)
  const person = people.find((member) => member.id === selectedId) ?? profile
  const day = useDay(person.id, today)
  // the sheet belongs to the day it was opened on, so it closes when the day rolls over
  const [openMeal, setOpenMeal] = useState<{ type: MealType; date: string } | null>(null)
  const openMealType = openMeal?.date === today ? openMeal.type : null
  // reported here too, so a save that fails after the sheet was closed isn't silent
  const latestChangeError = useLatestDayChangeError(person.id, today)

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
      {people.length > 1 && (
        <div className="mt-2">
          <SegmentedControl
            label="Person"
            options={people.map((member) => ({ value: member.id, label: displayName(member) }))}
            value={person.id}
            onChange={(id) => {
              setSelectedId(id)
              setOpenMeal(null)
            }}
          />
        </div>
      )}
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
            isOwnGoal={person.id === profile.id}
            name={displayName(person)}
            date={today}
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
                onClick={() => setOpenMeal({ type, date: today })}
              />
            ))}
          </GroupedSection>
        </>
      )}
      <MealSheet
        open={openMealType !== null}
        mealType={openMealType ?? 'breakfast'}
        userId={person.id}
        date={today}
        onClose={() => setOpenMeal(null)}
      />
    </>
  )
}
