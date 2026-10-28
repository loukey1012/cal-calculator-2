import { useId } from 'react'
import { formatGrams, formatKcal } from '../../nutrition/format'
import { METRIC_COLORS, METRIC_LABELS } from '../../trends/trendFormat'
import type { NutrientAverage, WeekAverages } from './weekStats'

type AveragesCardProps = {
  readonly averages: WeekAverages
  readonly within: { readonly within: number; readonly of: number } | null
}

/** The average calories of the counted days against the goal, then each nutrient with a goal. */
export function AveragesCard({ averages, within }: AveragesCardProps) {
  const headingId = useId()
  const { kcal, nutrients } = averages
  return (
    <section
      aria-labelledby={headingId}
      className="glass-surface mt-4 rounded-3xl bg-bg-elevated p-5 shadow-card"
    >
      <h2 id={headingId} className="caption">
        Averages
      </h2>
      <p className="mt-1 text-[20px] font-bold tabular-nums">
        {`Ø ${formatKcal(kcal.average)} kcal${kcal.goal === null ? '' : ` of ${formatKcal(kcal.goal)}`}`}
      </p>
      {within && (
        <p className="text-[14px] text-label-secondary">
          {`${within.within} of ${within.of} within goal`}
        </p>
      )}
      {nutrients.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {nutrients.map((nutrient) => (
            <NutrientRow key={nutrient.key} nutrient={nutrient} />
          ))}
        </ul>
      )}
    </section>
  )
}

function NutrientRow({ nutrient }: { readonly nutrient: NutrientAverage }) {
  const share = nutrient.goal > 0 ? Math.min(nutrient.average / nutrient.goal, 1) : 1
  return (
    <li>
      <div className="flex items-baseline justify-between text-[14px]">
        <span className="font-semibold">{METRIC_LABELS[nutrient.key]}</span>
        <span className="text-label-secondary tabular-nums">
          {`Ø ${formatGrams(nutrient.average)} g of ${formatGrams(nutrient.goal)} g`}
        </span>
      </div>
      <div aria-hidden="true" className="mt-1 h-1.5 overflow-hidden rounded-full bg-fill">
        <div
          className="h-full rounded-full"
          style={{ width: `${share * 100}%`, background: METRIC_COLORS[nutrient.key] }}
        />
      </div>
    </li>
  )
}
