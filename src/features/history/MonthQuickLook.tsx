import { goalForDate, type Goal } from '../nutrition/goals'
import type { DayTotal } from './calendar'
import { DayQuickLook } from './DayQuickLook'

type MonthQuickLookProps = {
  readonly userId: string
  readonly date: string
  readonly today: string
  readonly total: DayTotal | undefined
  /** undefined while the goals load: the verdict is left out then */
  readonly goals: readonly Goal[] | undefined
  readonly hasNote: boolean
  /** the person's household; without one there is no Sex button */
  readonly householdId: string | null
  /** whose day it is, when it's the partner's */
  readonly partnerName: string | null
  /** the finger has lifted (see DayQuickLook) */
  readonly pinned: boolean
  readonly onClose: () => void
}

/** The quick look at a held day of the month, with its verdict, calories and notes. */
export function MonthQuickLook({
  userId,
  date,
  today,
  total,
  goals,
  hasNote,
  householdId,
  partnerName,
  pinned,
  onClose,
}: MonthQuickLookProps) {
  const goal = goalForDate(goals ?? [], date)
  const kcal = total?.kcal ?? 0
  const estimated = total?.kcalEstimated === true
  return (
    <DayQuickLook
      userId={userId}
      date={date}
      kcal={kcal}
      estimated={estimated}
      goalKcal={goal?.kcal ?? null}
      status={
        goals === undefined
          ? null
          : { date, today, day: total ?? { date, mealCount: 0 }, kcal, estimated, goal }
      }
      hasFood={(total?.mealCount ?? 0) > 0}
      hasNote={hasNote}
      householdId={householdId}
      partnerName={partnerName}
      pinned={pinned}
      onClose={onClose}
    />
  )
}
