import { useState } from 'react'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { toUserMessage } from '../../lib/errors'
import type { Goal } from '../nutrition/goals'
import { BarTrendChart } from './BarTrendChart'
import { useNutritionDays } from './hooks'
import { StatTiles, type StatTile } from './StatTiles'
import {
  formatMetric,
  formatShortDay,
  formatSigned,
  formatSpan,
  formatTick,
  METRIC_COLORS,
  METRIC_LABELS,
  RANGE_NAMES,
} from './trendFormat'
import {
  nutritionBars,
  nutritionSummary,
  type NutritionMetric,
  type RangeBounds,
  type TrendBar,
  type TrendRange,
} from './trends'

type NutritionTrendProps = {
  readonly userId: string
  readonly metric: NutritionMetric
  readonly range: TrendRange
  readonly bounds: RangeBounds
  readonly goals: readonly Goal[]
}

function readout(metric: NutritionMetric, bar: TrendBar | undefined): string {
  if (!bar) return 'Tap a bar to see its value.'
  const value = `${bar.estimated ? '~' : ''}${formatMetric(metric, bar.value)}`
  const goal = bar.goal === null ? '' : ` · goal ${formatMetric(metric, bar.goal)}`
  const average = bar.start === bar.end ? '' : ' a day'
  return `${formatSpan(bar.start, bar.end)}: ${value}${average}${goal}`
}

function tiles(
  metric: NutritionMetric,
  summary: ReturnType<typeof nutritionSummary>,
  range: TrendRange,
): StatTile[] {
  const average = summary.average
  const change =
    average === null || summary.previousAverage === null ? null : average - summary.previousAverage
  return [
    { label: 'Ø per day', value: average === null ? '–' : formatMetric(metric, average) },
    {
      label: metric === 'kcal' ? 'Within goal' : 'Goal reached',
      value: `${summary.goalDays} of ${summary.loggedDays}`,
      detail: 'days',
    },
    {
      label: 'vs. previous',
      value: change === null ? '–' : formatSigned(metric, change),
      detail: RANGE_NAMES[range],
    },
  ]
}

/** Calories or one nutrient: bars with the goal, a readout, and a few figures. */
export function NutritionTrend({ userId, metric, range, bounds, goals }: NutritionTrendProps) {
  // one request for this range and the one before it
  const days = useNutritionDays(userId, bounds.previousFirst, bounds.last)
  const [selected, setSelected] = useState<number | null>(null)
  if (days.isError) return <ErrorBanner message={toUserMessage(days.error)} />
  if (days.isPending) return <p className="mt-6 text-center text-label-secondary">Loading…</p>

  const current = days.data.filter((day) => day.date >= bounds.first)
  const previous = days.data.filter((day) => day.date < bounds.first)
  const bars = nutritionBars(current, metric, range, goals)
  const summary = nutritionSummary(current, previous, metric, goals)
  const label = METRIC_LABELS[metric]

  return (
    <>
      <section
        aria-label={`${label} chart`}
        className="mt-3 rounded-[28px] bg-bg-elevated p-4 shadow-card"
      >
        <p
          aria-live="polite"
          className="mb-2 min-h-5 text-[13px] font-semibold text-label-secondary"
        >
          {readout(metric, selected === null ? undefined : bars[selected])}
        </p>
        {bars.length === 0 ? (
          <p className="py-12 text-center text-[15px] text-label-secondary">
            Nothing logged in this range.
          </p>
        ) : (
          <BarTrendChart
            key={`${metric}:${range}`}
            bars={bars}
            first={bounds.first}
            last={bounds.last}
            color={METRIC_COLORS[metric]}
            formatTick={formatTick}
            selected={selected}
            onSelect={(index) => setSelected((current) => (current === index ? null : index))}
          />
        )}
        <div className="mt-1 flex justify-between pl-9 text-[11px] font-semibold text-label-secondary">
          <span>{formatShortDay(bounds.first)}</span>
          <span>{formatShortDay(bounds.last)}</span>
        </div>
        <table className="sr-only">
          <caption>
            {label} per {range === '6m' || range === '1y' ? 'week' : 'day'}
          </caption>
          <tbody>
            {bars.map((bar) => (
              <tr key={bar.start}>
                <th scope="row">{formatSpan(bar.start, bar.end)}</th>
                <td>{formatMetric(metric, bar.value)}</td>
                <td>{bar.goal === null ? '' : `goal ${formatMetric(metric, bar.goal)}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <StatTiles tiles={tiles(metric, summary, range)} />
    </>
  )
}
