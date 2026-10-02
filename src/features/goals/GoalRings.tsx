import { formatGrams, formatKcal } from '../nutrition/format'
import type { GoalProgress, RingKey } from '../nutrition/goals'

const RING_SIZE = 132
const STROKE = 13
const GAP = 3

type RingStyle = { readonly label: string; readonly color: string; readonly unit: 'kcal' | 'g' }

// Activity-ring like palette that works in light and dark mode
const RING_STYLES: Record<RingKey, RingStyle> = {
  kcal: { label: 'Calories', color: '#ff375f', unit: 'kcal' },
  protein: { label: 'Protein', color: '#30d158', unit: 'g' },
  carbs: { label: 'Carbs', color: '#ffb340', unit: 'g' },
  fat: { label: 'Fat', color: '#40c8e0', unit: 'g' },
}

const targetFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

function amount(value: number, unit: RingStyle['unit']): string {
  return unit === 'kcal' ? formatKcal(value) : formatGrams(value)
}

function status({ remaining }: GoalProgress, unit: RingStyle['unit']): string {
  if (remaining === 0) return 'reached'
  const text = `${amount(Math.abs(remaining), unit)} ${unit}`
  return remaining > 0 ? `${text} left` : `${text} over`
}

/** Concentric rings (outermost: calories) with a legend; rings are full once a goal is reached. */
export function GoalRings({ progress }: { readonly progress: readonly GoalProgress[] }) {
  const center = RING_SIZE / 2
  return (
    <div className="flex items-center gap-4">
      <svg
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="h-32 w-32 shrink-0 -rotate-90"
        aria-hidden="true"
      >
        {progress.map((goal, index) => {
          const { color } = RING_STYLES[goal.key]
          const radius = center - STROKE / 2 - index * (STROKE + GAP)
          const circumference = 2 * Math.PI * radius
          const fill = Math.min(goal.ratio, 1)
          return (
            <g key={goal.key} data-testid="ring" data-fill={String(Math.round(fill * 1000) / 1000)}>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={color}
                strokeOpacity={0.2}
                strokeWidth={STROKE}
              />
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={`${fill * circumference} ${circumference}`}
              />
            </g>
          )
        })}
      </svg>
      <ul aria-label="Goals" className="min-w-0 flex-1 space-y-2">
        {progress.map((goal) => {
          const { label, color, unit } = RING_STYLES[goal.key]
          const consumed = `${goal.incomplete ? '≥ ' : ''}${amount(goal.consumed, unit)}`
          return (
            <li key={goal.key} className="text-[15px] leading-tight">
              <span className="flex items-center gap-1.5 font-semibold">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {label}
              </span>
              <span className="block text-label-secondary">
                {consumed} / {targetFormat.format(goal.target)} {unit}
              </span>
              <span className="block text-[13px] text-label-secondary">{status(goal, unit)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
