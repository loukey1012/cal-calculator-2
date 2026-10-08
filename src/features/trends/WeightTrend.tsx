import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { toUserMessage } from '../../lib/errors'
import { useLatestWeightChangeError, useWeights } from '../weight/hooks'
import { formatKg } from '../weight/weight'
import { WeightSheet } from '../weight/WeightSheet'
import { StatTiles, type StatTile } from './StatTiles'
import {
  formatShortDay,
  formatSigned,
  formatSpan,
  formatTick,
  METRIC_COLORS,
  RANGE_NAMES,
} from './trendFormat'
import {
  weightPoints,
  weightSummary,
  type RangeBounds,
  type TrendRange,
  type WeightPoint,
} from './trends'
import { WeightTrendChart } from './WeightTrendChart'

// the newest entries; older ones are still on the chart
const LISTED_ENTRIES = 10

type WeightTrendProps = {
  readonly userId: string
  /** only your own weight can be changed */
  readonly isOwn: boolean
  readonly range: TrendRange
  readonly bounds: RangeBounds
  readonly goalKg: number | null
}

function readout(point: WeightPoint | undefined): string {
  if (!point) return 'Tap a point to see its value.'
  const note = point.carried ? ' (entered before this range)' : ''
  return `${formatSpan(point.date, point.date)}: ${formatKg(point.weightKg)}${note}`
}

function tiles(summary: ReturnType<typeof weightSummary>, range: TrendRange): StatTile[] {
  const { current, change, toGo } = summary
  const reached = toGo !== null && Math.abs(toGo) < 0.05
  return [
    { label: 'Current', value: current === null ? '–' : formatKg(current) },
    {
      label: 'Change',
      value: change === null ? '–' : formatSigned('weight', change),
      detail: RANGE_NAMES[range],
    },
    {
      label: 'To goal',
      value: toGo === null ? '–' : reached ? 'Reached' : formatKg(Math.abs(toGo)),
      detail:
        toGo === null ? 'no target set' : reached ? undefined : toGo > 0 ? 'to lose' : 'to gain',
    },
  ]
}

/** Weight over the range with the target, its figures, and the entries to change. */
export function WeightTrend({ userId, isOwn, range, bounds, goalKg }: WeightTrendProps) {
  const weights = useWeights(userId)
  const changeError = useLatestWeightChangeError(userId)
  const [selected, setSelected] = useState<number | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  if (weights.isError) return <ErrorBanner message={toUserMessage(weights.error)} />
  if (weights.isPending) return <p className="mt-6 text-center text-label-secondary">Loading…</p>

  const entries = weights.data
  const points = weightPoints(entries, bounds.first, bounds.last)
  const newestFirst = entries.toReversed().slice(0, LISTED_ENTRIES)

  return (
    <>
      <section
        aria-label="Weight chart"
        className="mt-3 rounded-[28px] bg-bg-elevated p-4 shadow-card"
      >
        <p
          aria-live="polite"
          className="mb-2 min-h-5 text-[13px] font-semibold text-label-secondary"
        >
          {readout(selected === null ? undefined : points[selected])}
        </p>
        {points.length === 0 ? (
          <p className="py-12 text-center text-[15px] text-label-secondary">
            No weight entered in this range.
          </p>
        ) : (
          <WeightTrendChart
            key={range}
            points={points}
            first={bounds.first}
            last={bounds.last}
            goalKg={goalKg}
            color={METRIC_COLORS.weight}
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
          <caption>Weight</caption>
          <tbody>
            {points.map((point) => (
              <tr key={point.date}>
                <th scope="row">{formatSpan(point.date, point.date)}</th>
                <td>{formatKg(point.weightKg)}</td>
              </tr>
            ))}
            {goalKg !== null && (
              <tr>
                <th scope="row">Target</th>
                <td>{formatKg(goalKg)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      <StatTiles tiles={tiles(weightSummary(entries, bounds.first, bounds.last, goalKg), range)} />
      {changeError && (
        <ErrorBanner message={`Couldn’t save your weight. ${toUserMessage(changeError)}`} />
      )}
      {isOwn && (
        <div className="mt-4">
          <Button onClick={() => setEditing(bounds.last)}>Add weight</Button>
        </div>
      )}
      {newestFirst.length > 0 && (
        <GroupedSection header="Entries">
          {newestFirst.map((entry) => (
            <ListRow
              key={entry.date}
              title={formatSpan(entry.date, entry.date)}
              detail={formatKg(entry.weightKg)}
              onClick={isOwn ? () => setEditing(entry.date) : undefined}
            />
          ))}
        </GroupedSection>
      )}
      {editing !== null && (
        <WeightSheet
          userId={userId}
          entries={entries}
          date={editing}
          today={bounds.last}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
