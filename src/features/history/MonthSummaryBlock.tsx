import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { toUserMessage } from '../../lib/errors'
import type { Goal } from '../nutrition/goals'
import type { WeightEntry } from '../weight/weight'
import { monthSummary, type DayTotal } from './calendar'
import { monthGoalStats, weightChangeInMonth } from './monthStats'
import { highlightsText, summaryText } from './monthSummaryText'

type MonthSummaryBlockProps = {
  readonly totals: {
    readonly data: readonly DayTotal[] | undefined
    readonly isPending: boolean
    readonly isError: boolean
    readonly error: unknown
  }
  readonly goals: readonly Goal[] | undefined
  readonly weights: readonly WeightEntry[] | undefined
  readonly month: string
  readonly today: string
}

/** The month in one or two lines: the averages, and the days within goal, streak and weight. */
export function MonthSummaryBlock({
  totals,
  goals,
  weights,
  month,
  today,
}: MonthSummaryBlockProps) {
  if (totals.isError && totals.data === undefined) {
    return <ErrorBanner message={toUserMessage(totals.error)} />
  }
  return (
    <div className="mt-2 px-1 text-[14px] font-medium text-label-secondary">
      <p data-testid="month-summary">
        {totals.isPending ? 'Loading…' : summaryText(monthSummary(totals.data ?? [], today))}
      </p>
      <MonthHighlights
        totals={totals.data}
        goals={goals}
        weights={weights}
        month={month}
        today={today}
      />
    </div>
  )
}

type MonthHighlightsProps = {
  readonly totals: readonly DayTotal[] | undefined
  readonly goals: readonly Goal[] | undefined
  readonly weights: readonly WeightEntry[] | undefined
  readonly month: string
  readonly today: string
}

/** Days within goal, the longest streak and the weight change; nothing while there is none. */
function MonthHighlights({ totals, goals, weights, month, today }: MonthHighlightsProps) {
  // without the goals every counted day would look like one without a goal
  if (totals === undefined || goals === undefined) return null
  const text = highlightsText(
    monthGoalStats(totals, goals, today),
    weightChangeInMonth(weights ?? [], month),
  )
  if (text === '') return null
  return (
    <p data-testid="month-highlights" className="mt-0.5">
      {text}
    </p>
  )
}
