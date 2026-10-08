import { fromLocalDateString } from '../../lib/dates'
import { formatGrams, formatKcal } from '../nutrition/format'
import { formatKg } from '../weight/weight'
import type { TrendMetric, TrendRange } from './trends'

export const METRIC_LABELS: Readonly<Record<TrendMetric, string>> = {
  kcal: 'Calories',
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
  fiber: 'Fiber',
  weight: 'Weight',
}

/** Bars and lines wear the metric's ring color; weight the accent. */
export const METRIC_COLORS: Readonly<Record<TrendMetric, string>> = {
  kcal: 'var(--goal-kcal)',
  protein: 'var(--goal-protein)',
  carbs: 'var(--goal-carbs)',
  fat: 'var(--goal-fat)',
  fiber: 'var(--goal-fiber)',
  weight: 'var(--accent)',
}

/** e.g. "1,840 kcal", "92.0 g", "71.9 kg" */
export function formatMetric(metric: TrendMetric, value: number): string {
  if (metric === 'kcal') return `${formatKcal(value)} kcal`
  if (metric === 'weight') return formatKg(value)
  return `${formatGrams(value)} g`
}

/** Axis ticks: no unit, no needless decimals */
export function formatTick(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)
}

const DAY: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }
const SHORT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }

/** e.g. "Mon, Oct 5" or "Sep 28 – Oct 4" */
export function formatSpan(start: string, end: string): string {
  if (start === end)
    return new Intl.DateTimeFormat(undefined, DAY).format(fromLocalDateString(start))
  const format = new Intl.DateTimeFormat(undefined, SHORT)
  return `${format.format(fromLocalDateString(start))} – ${format.format(fromLocalDateString(end))}`
}

export function formatShortDay(date: string): string {
  return new Intl.DateTimeFormat(undefined, SHORT).format(fromLocalDateString(date))
}

/** e.g. "+120 kcal", "−2.1 kg" (a real minus sign) */
export function formatSigned(metric: TrendMetric, value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±'
  return `${sign}${formatMetric(metric, Math.abs(value))}`
}

export const RANGE_NAMES: Readonly<Record<TrendRange, string>> = {
  week: 'week',
  '4w': '4 weeks',
  '3m': '3 months',
  '6m': '6 months',
  '1y': 'year',
}
