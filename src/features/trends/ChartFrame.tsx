import type { ReactNode } from 'react'
import { CHART, yOf, type Scale } from './chartScale'

type ChartFrameProps = {
  readonly scale: Scale
  readonly formatTick: (value: number) => string
  readonly children: ReactNode
}

/** Hairline gridlines with their values on the left; the marks go on top. */
export function ChartFrame({ scale, formatTick, children }: ChartFrameProps) {
  return (
    <svg
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      className="block h-auto w-full overflow-visible"
      aria-hidden="true"
    >
      {scale.ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={CHART.left}
            x2={CHART.width - CHART.right}
            y1={yOf(scale, tick)}
            y2={yOf(scale, tick)}
            className="stroke-separator"
            strokeWidth={1}
          />
          <text
            x={CHART.left - 6}
            y={yOf(scale, tick)}
            dy="0.32em"
            textAnchor="end"
            className="fill-label-secondary text-[10px] font-semibold"
          >
            {formatTick(tick)}
          </text>
        </g>
      ))}
      {children}
    </svg>
  )
}

export type GoalSegment = { readonly x1: number; readonly x2: number; readonly y: number }

/** The goal as dashed lines over the bars (or across the chart), each at its own height. */
export function GoalLine({ segments }: { readonly segments: readonly GoalSegment[] }) {
  if (segments.length === 0) return null
  // neighbouring segments at the same height join up into one line
  const path = segments
    .map((segment, index) => {
      const previous = segments[index - 1]
      const joins =
        previous !== undefined && previous.y === segment.y && previous.x2 >= segment.x1 - 0.5
      return joins
        ? `L${segment.x2},${segment.y}`
        : `M${segment.x1},${segment.y} L${segment.x2},${segment.y}`
    })
    .join(' ')
  return (
    <path
      d={path}
      fill="none"
      className="stroke-label-secondary"
      strokeWidth={1.5}
      strokeDasharray="4 3"
      data-testid="goal-line"
    />
  )
}
