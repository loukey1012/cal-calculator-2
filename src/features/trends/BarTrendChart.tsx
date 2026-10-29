import { CHART, dayIndex, niceScale, PLOT_WIDTH, yOf } from './chartScale'
import { ChartFrame, GoalLine } from './ChartFrame'
import type { TrendBar } from './trends'

const MAX_BAR_WIDTH = 24
const BAR_SHARE = 0.7
const MIN_BAR_WIDTH = 1.5
const BAR_RADIUS = 4
const HEADROOM = 1.08
// days that don't count are drawn in grey (see TrendBarKind)
const GREY = 'var(--label-secondary)'
const GREY_OPACITY = 0.35

type BarTrendChartProps = {
  readonly bars: readonly TrendBar[]
  readonly first: string
  readonly last: string
  /** CSS color of the bars, e.g. the metric's ring color */
  readonly color: string
  readonly formatTick: (value: number) => string
  readonly selected: number | null
  readonly onSelect: (index: number) => void
}

/** A rounded-top bar path standing on the baseline (square at the bottom). */
function barPath(x: number, width: number, top: number, bottom: number): string {
  const radius = Math.min(BAR_RADIUS, width / 2, Math.max(bottom - top, 0))
  return [
    `M${x},${bottom}`,
    `L${x},${top + radius}`,
    `Q${x},${top} ${x + radius},${top}`,
    `L${x + width - radius},${top}`,
    `Q${x + width},${top} ${x + width},${top + radius}`,
    `L${x + width},${bottom}`,
    'Z',
  ].join(' ')
}

const isGhost = (bar: TrendBar) =>
  bar.kind === 'cheatDay' || bar.kind === 'alcoholDay' || bar.kind === 'cheatMeal'

/** How high a bar stands: a cheat day's ghost reaches its goal, so it never distorts the chart. */
function heightOf(bar: TrendBar): number {
  return isGhost(bar) ? (bar.goal ?? bar.value) : bar.value
}

function barStyle(bar: TrendBar, color: string, dimmed: boolean) {
  const dim = dimmed ? 0.5 : 1
  // one neutral look for every day that does not count (as in the calendar)
  if (isGhost(bar) || bar.kind === 'missing' || bar.kind === 'today') {
    return { fill: GREY, fillOpacity: GREY_OPACITY * dim }
  }
  return { fill: color, fillOpacity: dimmed ? 0.35 : bar.estimated ? 0.6 : 1 }
}

/** One bar per day or week, the goal as a dashed line; tapping a bar selects it. */
export function BarTrendChart({
  bars,
  first,
  last,
  color,
  formatTick,
  selected,
  onSelect,
}: BarTrendChartProps) {
  const totalDays = dayIndex(first, last) + 1
  const dayWidth = PLOT_WIDTH / totalDays
  const highest = Math.max(0, ...bars.map((bar) => Math.max(heightOf(bar), bar.goal ?? 0)))
  const scale = niceScale(0, highest * HEADROOM)
  const baseline = yOf(scale, 0)
  const slots = bars.map((bar) => {
    const start = Math.max(dayIndex(first, bar.start), 0)
    const end = Math.min(dayIndex(first, bar.end), totalDays - 1)
    const x = CHART.left + start * dayWidth
    return { x, width: (end - start + 1) * dayWidth }
  })
  const goalSegments = bars.flatMap((bar, index) => {
    const slot = slots[index]
    if (bar.goal === null || !slot) return []
    return [{ x1: slot.x, x2: slot.x + slot.width, y: yOf(scale, bar.goal) }]
  })

  return (
    <ChartFrame scale={scale} formatTick={formatTick}>
      {bars.map((bar, index) => {
        const slot = slots[index]
        if (!slot) return null
        const width = Math.max(MIN_BAR_WIDTH, Math.min(MAX_BAR_WIDTH, slot.width * BAR_SHARE))
        const x = slot.x + (slot.width - width) / 2
        const dimmed = selected !== null && selected !== index
        return (
          <g key={bar.start}>
            <path
              d={barPath(x, width, yOf(scale, heightOf(bar)), baseline)}
              {...barStyle(bar, color, dimmed)}
              data-testid="trend-bar"
              data-kind={bar.kind}
            />
            {/* the whole column is the tap target, bigger than the bar */}
            <rect
              x={slot.x}
              y={CHART.top}
              width={slot.width}
              height={baseline - CHART.top}
              fill="transparent"
              onClick={() => onSelect(index)}
            />
          </g>
        )
      })}
      <GoalLine segments={goalSegments} />
    </ChartFrame>
  )
}
