import { fromLocalDateString } from '../../lib/dates'

/** Axis scales for the trend charts: a few round ticks covering the values. */

const NICE_STEPS = [1, 2, 2.5, 5, 10] as const
const TARGET_TICKS = 5
const MS_PER_DAY = 86_400_000

export type Scale = {
  readonly min: number
  readonly max: number
  readonly ticks: readonly number[]
}

function niceStep(span: number): number {
  const rough = span / TARGET_TICKS
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = NICE_STEPS.find((candidate) => candidate * magnitude >= rough) ?? 10
  return step * magnitude
}

/** Round ticks around [low, high]; a flat range is widened so the line isn't on the edge. */
export function niceScale(low: number, high: number): Scale {
  const span = high - low || Math.max(Math.abs(high), 1)
  const step = niceStep(span)
  const min = Math.floor(low / step) * step
  const max = Math.max(Math.ceil(high / step) * step, min + step)
  const count = Math.round((max - min) / step)
  const ticks = Array.from({ length: count + 1 }, (_, index) =>
    Number((min + index * step).toFixed(6)),
  )
  return { min, max, ticks }
}

/** Whole days from `first` to `date` (local days, so clock changes don't matter). */
export function dayIndex(first: string, date: string): number {
  return Math.round(
    (fromLocalDateString(date).getTime() - fromLocalDateString(first).getTime()) / MS_PER_DAY,
  )
}

/** Shared geometry of the trend charts (SVG units; the chart scales to the card's width). */
export const CHART = { width: 330, height: 170, left: 38, right: 6, top: 8, bottom: 6 } as const
export const PLOT_WIDTH = CHART.width - CHART.left - CHART.right
const PLOT_HEIGHT = CHART.height - CHART.top - CHART.bottom

export function yOf(scale: Scale, value: number): number {
  return CHART.top + PLOT_HEIGHT * (1 - (value - scale.min) / (scale.max - scale.min))
}
