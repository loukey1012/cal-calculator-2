import { CHART, dayIndex, niceScale, PLOT_WIDTH, yOf } from './chartScale'
import { ChartFrame, GoalLine } from './ChartFrame'
import type { WeightPoint } from './trends'

const LINE_WIDTH = 2
const DOT_RADIUS = 4
const HIT_RADIUS = 14
const PADDING_KG = 0.5

type WeightTrendChartProps = {
  readonly points: readonly WeightPoint[]
  readonly first: string
  readonly last: string
  /** the target weight, if set */
  readonly goalKg: number | null
  readonly color: string
  readonly formatTick: (value: number) => string
  readonly selected: number | null
  readonly onSelect: (index: number) => void
}

/** The weight as a line through its entries; the target as a dashed line. */
export function WeightTrendChart({
  points,
  first,
  last,
  goalKg,
  color,
  formatTick,
  selected,
  onSelect,
}: WeightTrendChartProps) {
  const span = Math.max(dayIndex(first, last), 1)
  const values = [...points.map((point) => point.weightKg), ...(goalKg === null ? [] : [goalKg])]
  const scale = niceScale(Math.min(...values) - PADDING_KG, Math.max(...values) + PADDING_KG)
  const xOf = (date: string) => CHART.left + (dayIndex(first, date) / span) * PLOT_WIDTH
  const line = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'}${xOf(point.date)},${yOf(scale, point.weightKg)}`,
    )
    .join(' ')
  const goalY = goalKg === null ? null : yOf(scale, goalKg)

  return (
    <ChartFrame scale={scale} formatTick={formatTick}>
      {goalY !== null && (
        <GoalLine segments={[{ x1: CHART.left, x2: CHART.width - CHART.right, y: goalY }]} />
      )}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={LINE_WIDTH}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((point, index) => {
        const x = xOf(point.date)
        const y = yOf(scale, point.weightKg)
        const active = selected === index
        return (
          <g key={point.date} onClick={() => onSelect(index)}>
            <circle
              cx={x}
              cy={y}
              r={active ? DOT_RADIUS + 1.5 : DOT_RADIUS}
              // the weight carried in from before the range is hollow
              fill={point.carried ? 'var(--bg-elevated)' : color}
              stroke={point.carried ? color : 'var(--bg-elevated)'}
              strokeWidth={2}
              data-testid="weight-dot"
            />
            <circle cx={x} cy={y} r={HIT_RADIUS} fill="transparent" />
          </g>
        )
      })}
    </ChartFrame>
  )
}
