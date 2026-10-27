import { calorieOverLevel } from '../appearance/overColors'
import { toWholeKcal } from '../nutrition/format'
import type { Goal } from '../nutrition/goals'
import {
  isMissingMeals,
  missingMainMeals,
  type CountedDay,
} from '../../../supabase/functions/_shared/dayCounting'

/** How the pill is painted: the words always say it too, so color is never the only signal. */
export type PillTone =
  | 'within'
  /** more than 10 % over (the rings' first over color) */
  | 'over'
  /** more than 300 kcal over (the rings' second over color) */
  | 'wellOver'
  /** a cheat day or cheat meal */
  | 'leftOut'
  | 'alcohol'
  | 'missing'
  | 'neutral'

type DayStatusPillContent = { readonly text: string; readonly tone: PillTone }

export type DayStatusInput = {
  readonly date: string
  readonly today: string
  /** the day's marks and which main meals have food (see dayCounting) */
  readonly day: CountedDay
  readonly kcal: number
  /** some of the calories are an estimate */
  readonly estimated: boolean
  /** the goal that was valid on that day */
  readonly goal: Goal | null
}

const NOT_COUNTED = 'not counted'

const MISSING_TEXT: Record<string, string> = {
  lunch: 'Lunch missing',
  dinner: 'Dinner missing',
  'lunch,dinner': 'Lunch and dinner missing',
}

function percentOver(over: number, target: number): number {
  return Math.round((over / target) * 100)
}

/**
 * The one-line verdict on an open day, in the order the day-counting rule uses: a cheat day,
 * alcohol day or cheat meal and a missing main meal are never judged, then the calories against
 * the goal. Today is never judged either. Null when there is nothing to say (an early day
 * without food).
 */
export function dayStatusPill({
  date,
  today,
  day,
  kcal,
  estimated,
  goal,
}: DayStatusInput): DayStatusPillContent | null {
  if (day.cheatDay) return { text: `Cheat day · ${NOT_COUNTED}`, tone: 'leftOut' }
  if (day.alcoholDay) return { text: `Alcohol day · ${NOT_COUNTED}`, tone: 'alcohol' }
  if (day.cheatMeal) return { text: `Cheat meal · ${NOT_COUNTED}`, tone: 'leftOut' }
  if (isMissingMeals(date, day, today)) {
    const text = MISSING_TEXT[missingMainMeals(day).join(',')] ?? ''
    return { text: `${text} · ${NOT_COUNTED}`, tone: 'missing' }
  }
  const isToday = date >= today
  if (!isToday && day.mealCount === 0) return null
  if (!goal) return { text: 'No goal set', tone: 'neutral' }

  const tilde = estimated ? '~' : ''
  const consumed = toWholeKcal(kcal)
  const difference = Math.abs(goal.kcal - consumed)
  const isOver = consumed > goal.kcal
  const amount = `${tilde}${difference} kcal ${isOver ? 'over' : 'left'}`
  if (isToday) return { text: `So far · ${amount}`, tone: 'neutral' }

  const level = calorieOverLevel(consumed, goal.kcal)
  if (level === 'none') return { text: `Within goal · ${amount}`, tone: 'within' }
  if (level === 'well') return { text: `${tilde}${difference} kcal over`, tone: 'wellOver' }
  return {
    text: `${tilde}${difference} kcal over · ${percentOver(difference, goal.kcal)} %`,
    tone: 'over',
  }
}
