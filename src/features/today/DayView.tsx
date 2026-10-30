import type { ComponentType, SVGProps } from 'react'
import { usePagePath } from '../../app/pagePath'
import { useStackNavigate } from '../../app/stackNavigate'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { BreakfastIcon, DinnerIcon, LunchIcon, SnackIcon } from '../../components/ios/icons'
import { toUserMessage } from '../../lib/errors'
import { DayFlagButtons } from '../dayMarks/DayFlagButtons'
import { useDayFlags } from '../dayMarks/useDayFlags'
import { useGoals } from '../goals/hooks'
import { DayStatusPill } from '../history/DayStatusPill'
import { useAddFoodSession } from '../addFood/addFoodSessionContext'
import { useMealOfDay } from '../addFood/useMealOfDay'
import { useLatestDishChangeError } from '../dishes/hooks'
import { LeftoversPill } from '../dishes/LeftoversPill'
import type { Profile } from '../household/householdApi'
import { useLookOf } from '../household/usePersonLook'
import { ItemsDietMarks } from '../ingredients/ItemsDietMarks'
import { cheatMeals, itemsByMeal, mealEntries, MEAL_TYPES, type MealType } from '../meals/dayModel'
import { useDay, useDayNote, useLatestDayChangeError, useDayMark } from '../meals/hooks'
import { mealPath } from '../meals/mealPages'
import { NoteEntryRow } from '../notes/NoteEntryRow'
import { dayNotePath } from '../notes/notePages'
import { isDraftFor } from '../meals/unsavedDish'
import { formatKcalTotal } from '../nutrition/format'
import { goalForDate } from '../nutrition/goals'
import type { NutritionTotals } from '../nutrition/types'
import { mealTotals, sumTotals } from '../nutrition/totals'
import { isLeftOut } from '../../../supabase/functions/_shared/dayCounting'
import { GoalCard } from './GoalCard'
import { useToday } from './useToday'

const MEAL_ICONS: Record<MealType, ComponentType<SVGProps<SVGSVGElement>>> = {
  breakfast: BreakfastIcon,
  lunch: LunchIcon,
  dinner: DinnerIcon,
  snack: SnackIcon,
}

function itemCount(count: number): string {
  return count === 1 ? '1 item' : `${count} items`
}

type MealSummary = {
  readonly count: number
  readonly totals: NutritionTotals
  readonly cheatMeal: boolean
  /** a dish for it is being put together, not logged yet */
  readonly unsaved: boolean
}

function mealSubtitle(
  loading: boolean,
  offline: boolean,
  { count, totals, cheatMeal, unsaved }: MealSummary,
): string {
  if (loading) return offline ? 'Offline – not loaded yet' : 'Loading…'
  if (unsaved)
    return count === 0 ? 'Unsaved dish' : `Unsaved dish · ${formatKcalTotal(totals)} kcal`
  if (cheatMeal) return count === 0 ? 'Cheat meal' : `Cheat meal · ${formatKcalTotal(totals)} kcal`
  if (count === 0) return 'Nothing logged'
  return `${formatKcalTotal(totals)} kcal · ${itemCount(count)}`
}

type MealCardProps = {
  readonly type: MealType
  readonly label: string
  readonly subtitle: string
  readonly note: string | null
  /** the ingredient of every item, for the diet marks by its name (null: a custom item) */
  readonly ingredientIds: ReadonlyArray<string | null>
  /** a dish for it is waiting, not logged yet: a dot by its name */
  readonly unsaved: boolean
  readonly onOpen: () => void
}

function MealCard({ type, label, subtitle, note, ingredientIds, unsaved, onOpen }: MealCardProps) {
  const MealIcon = MEAL_ICONS[type]
  return (
    <button
      type="button"
      onClick={onOpen}
      className="glass-surface flex min-w-0 flex-col gap-1.5 rounded-[22px] bg-bg-elevated p-3 text-left shadow-card transition-transform active:scale-[0.98]"
    >
      {/* icon beside the name keeps the 2×2 grid short enough for Today to fit the screen */}
      <span className="flex min-w-0 items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-ink">
          <MealIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0 truncate text-[16px] font-extrabold">{label}</span>
        {unsaved && (
          <span
            data-testid="unsaved-dot"
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent-ink"
          />
        )}
        <ItemsDietMarks ingredientIds={ingredientIds} className="ml-auto" />
      </span>
      <span className="block truncate px-0.5 text-[13px] font-semibold text-label-secondary">
        {subtitle}
      </span>
      {note && (
        <span className="-mt-1 flex items-start gap-1.5 px-0.5 text-[12px] text-label-secondary">
          <span
            data-testid="meal-note-dot"
            aria-hidden="true"
            className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-ink"
          />
          <span className="line-clamp-2 min-w-0 break-words">{note}</span>
        </span>
      )}
    </button>
  )
}

type DayViewProps = {
  readonly person: Profile
  readonly isOwnDay: boolean
  /** local YYYY-MM-DD; today or any past day, all editable */
  readonly date: string
  /**
   * History: the day's verdict and its Note row come first. Today stays compact, with the Note
   * row under the Meals heading.
   */
  readonly showStatus?: boolean
}

/** A person's day: goal progress, total and the four meals, each opening as a page of its own. */
export function DayView({ person, isOwnDay, date, showStatus = false }: DayViewProps) {
  const day = useDay(person.id, date)
  const dayMark = useDayMark(person.id, date).data ?? null
  const dayNote = useDayNote(person.id, date).data ?? null
  const today = useToday()
  const goals = useGoals(person.id)
  const lookOf = useLookOf()
  // reported here too, so a save that fails after its meal was left isn't silent
  const latestDayError = useLatestDayChangeError(person.id, date)
  const latestDishError = useLatestDishChangeError()
  const latestChangeError = latestDayError ?? latestDishError
  const flags = useDayFlags({ userId: person.id, householdId: person.household_id, date })
  const navigate = useStackNavigate()
  const from = usePagePath().startsWith('/history') ? 'history' : 'today'
  const { draft } = useAddFoodSession()
  const mealOfDay = useMealOfDay()
  const mealOf = (mealType: MealType) => ({ userId: person.id, date, mealType })
  const openMeal = (mealType: MealType) =>
    navigate(mealPath(mealOf(mealType), from), { person: person.id })
  const noteRow = (
    <NoteEntryRow
      note={dayNote}
      label="Day"
      onOpen={() => navigate(dayNotePath({ userId: person.id, date }, from), { person: person.id })}
    />
  )

  const byMeal = itemsByMeal(day.data ?? [])
  const cheatMealTypes = cheatMeals(day.data ?? [])
  const meals = MEAL_TYPES.map(({ type, label }) => ({
    type,
    label,
    // a cooked dish is one item, like it is one block in the meal
    count: mealEntries(byMeal[type]).length,
    totals: mealTotals(byMeal[type]),
    cheatMeal: cheatMealTypes.has(type),
    unsaved: isDraftFor(draft, mealOf(type), today, mealOfDay),
    note: day.data?.find((meal) => meal.meal_type === type)?.note ?? null,
    ingredientIds: byMeal[type].map((item) => item.ingredient_id),
  }))
  const dayTotals = sumTotals(meals.map((meal) => meal.totals))
  const hasCheatMeal = cheatMealTypes.size > 0
  // a past day without lunch or dinner doesn't count (History flags it too)
  const counted = {
    date,
    mealCount: meals.filter((meal) => meal.count > 0).length,
    cheatDay: dayMark === 'cheat',
    alcoholDay: dayMark === 'alcohol',
    cheatMeal: hasCheatMeal,
    lunchLogged: byMeal.lunch.length > 0,
    dinnerLogged: byMeal.dinner.length > 0,
  }

  return (
    <>
      {latestChangeError && (
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
          {showStatus && (
            <div className="mt-2 flex flex-col items-start gap-2">
              {!day.isPending && goals.data !== undefined && (
                <DayStatusPill
                  input={{
                    date,
                    today,
                    day: counted,
                    kcal: dayTotals.kcal,
                    estimated: dayTotals.estimated,
                    goal: goalForDate(goals.data, date),
                  }}
                />
              )}
              <div className="w-full">{noteRow}</div>
            </div>
          )}
          <GoalCard
            key={person.id}
            userId={person.id}
            isOwnGoal={isOwnDay}
            name={lookOf(person).name}
            date={date}
            totals={dayTotals}
            // over colors would judge a day that is left out
            showOver={!isLeftOut(counted)}
            flags={
              <DayFlagButtons
                key={`${person.id}|${date}`}
                flags={flags}
                partnerName={isOwnDay ? null : lookOf(person).name}
              />
            }
          />
          <section className="mt-4">
            <div data-testid="day-total" className="mb-3 px-1">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="shrink-0 font-display text-[20px] font-bold">Meals</h2>
                {/* the leftovers offer in the heading row, so Today still fits the screen */}
                <span className="flex min-w-0 flex-1">
                  <LeftoversPill onOpen={() => openMeal(mealOfDay)} />
                </span>
              </div>
              {/* the day's kcal and macros are on the goal card above, not repeated here */}
            </div>
            {!showStatus && <div className="mb-3">{noteRow}</div>}
            <div className="grid grid-cols-2 gap-3">
              {meals.map(({ type, label, note, ingredientIds, ...summary }) => (
                <MealCard
                  key={type}
                  type={type}
                  label={label}
                  note={note}
                  ingredientIds={ingredientIds}
                  subtitle={mealSubtitle(day.isPending, day.fetchStatus === 'paused', summary)}
                  unsaved={summary.unsaved}
                  onOpen={() => openMeal(type)}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </>
  )
}
