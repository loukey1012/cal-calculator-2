import { useState, type ComponentType, type SVGProps } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { BreakfastIcon, DinnerIcon, LunchIcon, SnackIcon } from '../../components/ios/icons'
import { toUserMessage } from '../../lib/errors'
import { cookLink } from '../cook/cookLink'
import { useLatestDishChangeError } from '../dishes/hooks'
import { LeftoversPill } from '../dishes/LeftoversPill'
import type { Profile } from '../household/householdApi'
import { useLookOf } from '../household/usePersonLook'
import { itemsByMeal, mealEntries, MEAL_TYPES, type MealType } from '../meals/dayModel'
import { useDay, useLatestDayChangeError } from '../meals/hooks'
import { MealSheet } from '../meals/MealSheet'
import { formatKcalTotal, macroSummary } from '../nutrition/format'
import type { NutritionTotals } from '../nutrition/types'
import { mealTotals, sumTotals } from '../nutrition/totals'
import { GoalCard } from './GoalCard'

const MEAL_ICONS: Record<MealType, ComponentType<SVGProps<SVGSVGElement>>> = {
  breakfast: BreakfastIcon,
  lunch: LunchIcon,
  dinner: DinnerIcon,
  snack: SnackIcon,
}

function itemCount(count: number): string {
  return count === 1 ? '1 item' : `${count} items`
}

function mealSubtitle(
  loading: boolean,
  offline: boolean,
  count: number,
  totals: NutritionTotals,
): string {
  if (loading) return offline ? 'Offline – not loaded yet' : 'Loading…'
  if (count === 0) return 'Nothing logged'
  return `${formatKcalTotal(totals)} kcal · ${itemCount(count)}`
}

type MealCardProps = {
  readonly type: MealType
  readonly label: string
  readonly subtitle: string
  readonly onOpen: () => void
}

function MealCard({ type, label, subtitle, onOpen }: MealCardProps) {
  const MealIcon = MEAL_ICONS[type]
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-w-0 flex-col gap-1.5 rounded-[22px] bg-bg-elevated p-3 text-left shadow-card transition-transform active:scale-[0.98]"
    >
      {/* icon beside the name keeps the 2×2 grid short enough for Today to fit the screen */}
      <span className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-ink">
          <MealIcon className="h-4 w-4" />
        </span>
        <span className="text-[16px] font-extrabold">{label}</span>
      </span>
      <span className="block truncate px-0.5 text-[13px] font-semibold text-label-secondary">
        {subtitle}
      </span>
    </button>
  )
}

type DayViewProps = {
  readonly person: Profile
  readonly isOwnDay: boolean
  /** local YYYY-MM-DD; today or any past day, all editable */
  readonly date: string
}

/**
 * A person's day: goal progress, total and the four meals. A meal with food opens to be looked
 * at, changed or removed; an empty one opens Cook for it.
 */
export function DayView({ person, isOwnDay, date }: DayViewProps) {
  const day = useDay(person.id, date)
  const lookOf = useLookOf()
  // the sheet belongs to the day it was opened on, so it closes when the day rolls over
  const [openMeal, setOpenMeal] = useState<{ type: MealType; date: string } | null>(null)
  const openMealType = openMeal?.date === date ? openMeal.type : null
  // reported here too, so a save that fails after the sheet was closed (or on Cook) isn't silent
  const latestDayError = useLatestDayChangeError(person.id, date)
  const latestDishError = useLatestDishChangeError()
  const latestChangeError = latestDayError ?? latestDishError
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // food is added on Cook, set up for this person, day and meal; saving comes back here
  const openCook = (mealType: MealType) =>
    void navigate(cookLink({ userId: person.id, date, mealType }, pathname), { replace: true })

  const byMeal = itemsByMeal(day.data ?? [])
  const meals = MEAL_TYPES.map(({ type, label }) => ({
    type,
    label,
    // a cooked dish is one item, like it is one block in the meal
    count: mealEntries(byMeal[type]).length,
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
            name={lookOf(person).name}
            date={date}
            totals={dayTotals}
          />
          <section className="mt-4">
            <div data-testid="day-total" className="mb-3 px-1">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-[20px] font-bold">Meals</h2>
                {/* in the heading row, so Today still fits the screen */}
                <span className="flex min-w-0 flex-1">
                  <LeftoversPill />
                </span>
                {!day.isPending && (
                  <span className="text-[15px] font-bold">{formatKcalTotal(dayTotals)} kcal</span>
                )}
              </div>
              <p className="text-[13px] font-semibold text-label-secondary">
                {day.isPending ? 'Loading…' : macroSummary(dayTotals)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {meals.map(({ type, label, count, totals }) => (
                <MealCard
                  key={type}
                  type={type}
                  label={label}
                  subtitle={mealSubtitle(
                    day.isPending,
                    day.fetchStatus === 'paused',
                    count,
                    totals,
                  )}
                  onOpen={() =>
                    !day.isPending && count === 0 ? openCook(type) : setOpenMeal({ type, date })
                  }
                />
              ))}
            </div>
          </section>
        </>
      )}
      <MealSheet
        open={openMealType !== null}
        mealType={openMealType ?? 'breakfast'}
        userId={person.id}
        date={date}
        onClose={() => setOpenMeal(null)}
        onCook={() => {
          setOpenMeal(null)
          openCook(openMealType ?? 'breakfast')
        }}
      />
    </>
  )
}
