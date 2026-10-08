import { useState } from 'react'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { toUserMessage } from '../../lib/errors'
import { useGoals } from '../goals/hooks'
import { FilterChip } from '../ingredients/FilterChip'
import { goalForDate } from '../nutrition/goals'
import { useWeights } from '../weight/hooks'
import { NutritionTrend } from './NutritionTrend'
import { METRIC_LABELS, RANGE_NAMES } from './trendFormat'
import {
  availableMetrics,
  rangeBounds,
  TREND_RANGES,
  type TrendMetric,
  type TrendRange,
} from './trends'
import { WeightTrend } from './WeightTrend'

const RANGE_OPTIONS = TREND_RANGES.map((value) => ({
  value,
  label: value === '1y' ? '1 year' : RANGE_NAMES[value],
}))

type TrendsViewProps = {
  readonly userId: string
  readonly isOwn: boolean
  readonly today: string
}

/** History › Trends: one metric over one range; only what has a goal (and weight) is offered. */
export function TrendsView({ userId, isOwn, today }: TrendsViewProps) {
  const goals = useGoals(userId)
  const weights = useWeights(userId)
  const [range, setRange] = useState<TrendRange>('4w')
  const [chosen, setChosen] = useState<TrendMetric>('kcal')
  if (goals.isError) return <ErrorBanner message={toUserMessage(goals.error)} />

  const goalList = goals.data ?? []
  const currentGoal = goalForDate(goalList, today)
  const metrics = availableMetrics(currentGoal, (weights.data ?? []).length > 0)
  // a goal removed meanwhile: back to calories
  const metric = metrics.includes(chosen) ? chosen : 'kcal'
  const bounds = rangeBounds(range, today)

  return (
    <section aria-label="Trends" className="mt-4">
      <SegmentedControl label="Range" options={RANGE_OPTIONS} value={range} onChange={setRange} />
      <div
        role="group"
        aria-label="Show"
        className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {metrics.map((option) => (
          <FilterChip
            key={option}
            chipKey={option}
            selected={option === metric}
            onClick={() => setChosen(option)}
            className="shrink-0 px-3.5 py-1.5 text-[14px]"
          >
            {METRIC_LABELS[option]}
          </FilterChip>
        ))}
      </div>
      {metric === 'weight' ? (
        <WeightTrend
          key={range}
          userId={userId}
          isOwn={isOwn}
          range={range}
          bounds={bounds}
          goalKg={currentGoal?.weightGoalKg ?? null}
        />
      ) : (
        <NutritionTrend
          key={`${metric}:${range}`}
          userId={userId}
          metric={metric}
          range={range}
          bounds={bounds}
          goals={goalList}
        />
      )}
    </section>
  )
}
