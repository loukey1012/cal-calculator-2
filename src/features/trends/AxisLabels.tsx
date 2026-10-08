import { fromLocalDateString } from '../../lib/dates'
import { CHART } from './chartScale'
import { formatShortDay } from './trendFormat'
import { addDays, type RangeBounds, type TrendRange } from './trends'

const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const DAYS_PER_WEEK = 7
// the plot's edges as a share of the chart's width, so labels line up with it
const PLOT_INSET = {
  paddingLeft: `${(CHART.left / CHART.width) * 100}%`,
  paddingRight: `${(CHART.right / CHART.width) * 100}%`,
}

type AxisLabelsProps = {
  readonly range: TrendRange
  readonly bounds: RangeBounds
  /** bars sit in the middle of their day; line points on the day itself */
  readonly align: 'slots' | 'points'
}

/** The week's weekdays under the chart, otherwise its first and last day. */
export function AxisLabels({ range, bounds, align }: AxisLabelsProps) {
  const className = 'mt-1 text-[11px] font-semibold text-label-secondary'
  if (range !== 'week') {
    return (
      <div className={`${className} flex justify-between`} style={PLOT_INSET}>
        <span>{formatShortDay(bounds.first)}</span>
        <span>{formatShortDay(bounds.last)}</span>
      </div>
    )
  }
  const days = Array.from({ length: DAYS_PER_WEEK }, (_, index) => addDays(bounds.first, index))
  return (
    <div
      className={`${className} ${align === 'slots' ? 'grid grid-cols-7 text-center' : 'flex justify-between'}`}
      style={PLOT_INSET}
      aria-hidden="true"
    >
      {days.map((day) => (
        <span key={day}>{WEEKDAY.format(fromLocalDateString(day))}</span>
      ))}
    </div>
  )
}
