import { useId } from 'react'
import { ErrorBanner } from '../../../components/ios/ErrorBanner'
import { formatKcal } from '../../nutrition/format'
import { formatShortDay } from '../../trends/trendFormat'
import { TRACKING_START } from '../../../../supabase/functions/_shared/dayCounting'
import { formatSaved, plural } from './weekFormat'
import type { DailyBudget, SavedKcal } from './weekStats'

type SavedCardProps = {
  /** this week's figure; null when no counted day has a burned figure */
  readonly saved: SavedKcal | null
  /** some goal of the person sets calories burned */
  readonly hasBurned: boolean
  readonly personName: string
  readonly isOwn: boolean
  readonly isRunning: boolean
  /** the running total since tracking started: undefined while loading, null when none applies */
  readonly total: SavedKcal | null | undefined
  readonly totalError: string | null
  readonly budget: DailyBudget | null
}

/** What the week saved (burned minus eaten over its counted days), and the total since the start. */
export function SavedCard({
  saved,
  hasBurned,
  personName,
  isOwn,
  isRunning,
  total,
  totalError,
  budget,
}: SavedCardProps) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className="glass-surface mt-4 rounded-3xl bg-bg-elevated p-5 shadow-card"
    >
      <h2 id={headingId} className="caption">
        {isRunning ? 'Saved so far' : 'Saved this week'}
      </h2>
      {saved ? (
        <>
          <p className="mt-1 font-display text-[34px] leading-tight font-extrabold tabular-nums">
            {formatSaved(saved.saved)}
          </p>
          <p className="mt-1 text-[14px] text-label-secondary">
            {`Burned ${formatKcal(saved.burned)} · ate ${formatKcal(saved.eaten)} · ${countedDaysOf(saved)}`}
          </p>
        </>
      ) : (
        <p className="mt-1 text-[15px] text-label-secondary">
          {hasBurned
            ? 'No counted days to add up yet.'
            : isOwn
              ? 'Set your calories burned in Settings › Goals to see calories saved'
              : `No calories burned are set for ${personName}.`}
        </p>
      )}
      {totalError !== null && <ErrorBanner message={totalError} />}
      {total && (
        <p className="mt-3 border-t border-separator pt-3 text-[14px] text-label-secondary">
          <span className="font-bold text-label tabular-nums">{formatSaved(total.saved)}</span>
          {`${total.saved >= 0 ? ' saved' : ''} since ${formatShortDay(TRACKING_START)}`}
        </p>
      )}
      {isRunning && budget && <BudgetLines budget={budget} />}
    </section>
  )
}

/** "3 counted days", or "3 of 5 counted days (2 without calories burned)" when some lack the figure. */
function countedDaysOf({ days, counted }: SavedKcal): string {
  if (counted <= days) return plural(days, 'counted day', 'counted days')
  return `${days} of ${counted} counted days (${counted - days} without calories burned)`
}

function BudgetLines({ budget }: { readonly budget: DailyBudget }) {
  return (
    <div className="mt-3 border-t border-separator pt-3 text-[14px]">
      <p className="font-semibold">{plural(budget.daysLeft, 'day left', 'days left')}</p>
      <p className="text-label-secondary">
        {budget.perDay > 0
          ? `Up to ${formatKcal(budget.perDay)} kcal a day keeps this week within goal`
          : 'This week is already over goal'}
      </p>
      <p className="text-label-secondary">Today counts once it’s over</p>
    </div>
  )
}
