import { useState } from 'react'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { toUserMessage } from '../../lib/errors'
import { useGoals } from '../goals/hooks'
import { FilterChip } from '../ingredients/FilterChip'
import { goalForDate } from '../nutrition/goals'
import { useWeights } from '../weight/hooks'
import { NutritionTrend } from './NutritionTrend'
import { METRIC_LABELS } from './trendFormat'
import {
  availableMetrics,
  mondayOf,
  rangeBounds,
  TREND_RANGES,
  type TrendMetric,
  type TrendRange,
} from './trends'
import { WeekPicker } from './WeekPicker'
import { WeightTrend } from './WeightTrend'

// short, so all five fit one line on an iPhone
const SEGMENT_LABELS: Readonly<Record<TrendRange, string>> = {
  week: 'Week',
  '4w': '4 wks',
  '3m': '3 mo',
  '6m': '6 mo',
  '1y': 'Year',
}

const RANGE_OPTIONS = TREND_RANGES.map((value) => ({
  value,
  label: SEGMENT_LABELS[value],
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
  // the current calendar week first: what most days are about
  const [range, setRange] = useState<TrendRange>('week')
  const [chosen, setChosen] = useState<TrendMetric>('kcal')
  // the Week view's week; null follows the current one, also when a new week starts
  const [chosenWeek, setChosenWeek] = useState<string | null>(null)
  if (goals.isError) return <ErrorBanner message={toUserMessage(goals.error)} />

  const goalList = goals.data ?? []
  const currentGoal = goalForDate(goalList, today)
  const metrics = availableMetrics(currentGoal, (weights.data ?? []).length > 0)
  // a goal removed meanwhile: back to calories
  const metric = metrics.includes(chosen) ? chosen : 'kcal'
  const currentWeek = mondayOf(today)
  const week = chosenWeek ?? currentWeek
  const bounds = rangeBounds(range, today, week)
  const changeRange = (next: TrendRange) => {
    setRange(next)
    // another range starts again from this week
    setChosenWeek(null)
  }

  return (
    <section aria-label="Trends" className="mt-4">
      <SegmentedControl
        label="Range"
        options={RANGE_OPTIONS}
        value={range}
        onChange={changeRange}
      />
      {range === 'week' && (
        <WeekPicker
          userId={userId}
          today={today}
          monday={week}
          onChange={(monday) => setChosenWeek(monday === currentWeek ? null : monday)}
        />
      )}
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
          key={`${range}:${bounds.first}`}
          userId={userId}
          isOwn={isOwn}
          range={range}
          bounds={bounds}
          today={today}
          goalKg={currentGoal?.weightGoalKg ?? null}
        />
      ) : (
        <NutritionTrend
          key={`${metric}:${range}:${bounds.first}`}
          userId={userId}
          metric={metric}
          range={range}
          bounds={bounds}
          goals={goalList}
          today={today}
        />
      )}
    </section>
  )
}
