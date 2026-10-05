import type { ProgressStyle } from '../appearance/appearance'
import { formatGrams, formatKcal } from '../nutrition/format'
import type { GoalProgress, RingKey } from '../nutrition/goals'

type Unit = 'kcal' | 'g'
type GoalStyle = { readonly label: string; readonly color: string; readonly unit: Unit }

// colors follow the account's goal palette (see useAppearance)
const GOAL_STYLES: Record<RingKey, GoalStyle> = {
  kcal: { label: 'Calories', color: 'var(--goal-kcal)', unit: 'kcal' },
  protein: { label: 'Protein', color: 'var(--goal-protein)', unit: 'g' },
  carbs: { label: 'Carbs', color: 'var(--goal-carbs)', unit: 'g' },
  fat: { label: 'Fat', color: 'var(--goal-fat)', unit: 'g' },
}

const targetFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

function amount(value: number, unit: Unit): string {
  return unit === 'kcal' ? formatKcal(value) : formatGrams(value)
}

function status({ remaining }: GoalProgress, unit: Unit): string {
  if (remaining === 0) return 'reached'
  const text = `${amount(Math.abs(remaining), unit)} ${unit}`
  return remaining > 0 ? `${text} left` : `${text} over`
}

/** e.g. "≥ 55.0 / 50", the "≥" marking a lower bound */
function consumedOfTargetNumbers(goal: GoalProgress, unit: Unit): string {
  const consumed = `${goal.incomplete ? '≥ ' : ''}${amount(goal.consumed, unit)}`
  return `${consumed} / ${targetFormat.format(goal.target)}`
}

function consumedOfTarget(goal: GoalProgress, unit: Unit): string {
  return `${consumedOfTargetNumbers(goal, unit)} ${unit}`
}

/** rings and bars are full once a goal is reached */
function fillOf(goal: GoalProgress): number {
  return Math.min(Math.max(goal.ratio, 0), 1)
}

type MeterProps = { readonly goal: GoalProgress; readonly color: string }

function Ring({ goal, color, size, stroke }: MeterProps & { size: number; stroke: number }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const fill = fillOf(goal)
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="shrink-0 -rotate-90"
      aria-hidden="true"
      data-testid="ring"
      data-fill={String(Math.round(fill * 1000) / 1000)}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        style={{ stroke: 'var(--track)' }}
      />
      {/* a round cap on an empty arc would still paint a dot */}
      {fill > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${fill * circumference} ${circumference}`}
          style={{ stroke: color }}
        />
      )}
    </svg>
  )
}

function Bar({ goal, color, thin = false }: MeterProps & { thin?: boolean }) {
  const fill = fillOf(goal)
  return (
    <div
      aria-hidden="true"
      data-testid="bar"
      data-fill={String(Math.round(fill * 1000) / 1000)}
      className={`overflow-hidden rounded-full bg-track ${thin ? 'h-1.5' : 'h-2'}`}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${fill * 100}%`, backgroundColor: color }}
      />
    </div>
  )
}

/** the calorie headline is a big ring in both ring styles */
function kcalAsRing(style: ProgressStyle): boolean {
  return style === 'rings' || style === 'ringBars'
}

/** only the full ring style turns the macros into rings too */
function macrosAsRings(style: ProgressStyle): boolean {
  return style === 'rings'
}

const KCAL_RING_SIZE = 128
const KCAL_RING_STROKE = 12
const MACRO_RING_SIZE = 52
const MACRO_RING_STROKE = 7

function KcalHero({ goal, style }: { goal: GoalProgress; style: ProgressStyle }) {
  const { label, color, unit } = GOAL_STYLES.kcal
  const over = goal.remaining < 0
  const remaining = amount(Math.abs(goal.remaining), unit)
  const remainingLabel = `kcal ${over ? 'over' : 'left'}`

  if (kcalAsRing(style)) {
    return (
      <li className="col-span-full flex items-center gap-5">
        <div className="relative">
          <Ring goal={goal} color={color} size={KCAL_RING_SIZE} stroke={KCAL_RING_STROKE} />
          <p className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[26px] leading-none font-bold tracking-tight">
              {remaining}
            </span>{' '}
            <span className="mt-1 text-[12px] font-semibold text-label-secondary">
              {remainingLabel}
            </span>
          </p>
        </div>
        <div className="min-w-0 space-y-1">
          <p className="caption">{label}</p>
          <p className="font-display text-[20px] font-bold">
            {consumedOfTargetNumbers(goal, unit)}{' '}
            <span className="text-[13px] font-semibold text-label-secondary">{unit}</span>
          </p>
        </div>
      </li>
    )
  }
  return (
    <li className="col-span-full space-y-2">
      <div className="flex items-end justify-between gap-3">
        <p className="font-display leading-none">
          <span className="text-[32px] font-bold tracking-tight">{remaining}</span>{' '}
          <span className="text-[13px] font-semibold text-label-secondary">{remainingLabel}</span>
        </p>
        <span className="text-right text-[13px] font-semibold text-label-secondary">
          <span className="sr-only">{label} </span>
          {consumedOfTarget(goal, unit)}
        </span>
      </div>
      <Bar goal={goal} color={color} thin={style === 'compact'} />
    </li>
  )
}

function MacroItem({ goal, style }: { goal: GoalProgress; style: ProgressStyle }) {
  const { label, color, unit } = GOAL_STYLES[goal.key]
  const text = (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[13px] font-bold">
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </p>
      <p className="truncate text-[12px] font-semibold text-label-secondary">
        {consumedOfTarget(goal, unit)}
      </p>
      {style !== 'compact' && (
        <p className="truncate text-[12px] text-label-secondary">{status(goal, unit)}</p>
      )}
    </div>
  )

  if (macrosAsRings(style)) {
    return (
      <li className="flex flex-col items-center gap-2 text-center">
        <Ring goal={goal} color={color} size={MACRO_RING_SIZE} stroke={MACRO_RING_STROKE} />
        {text}
      </li>
    )
  }
  return (
    <li className="space-y-1.5">
      {text}
      <Bar goal={goal} color={color} thin={style === 'compact'} />
    </li>
  )
}

type GoalProgressViewProps = {
  readonly progress: readonly GoalProgress[]
  /** the viewer's own choice, also when looking at someone else's day */
  readonly style: ProgressStyle
}

/** Calories as the headline, then one item per macro goal that is set. */
export function GoalProgressView({ progress, style }: GoalProgressViewProps) {
  const kcal = progress.find((goal) => goal.key === 'kcal')
  const macros = progress.filter((goal) => goal.key !== 'kcal')
  return (
    <ul
      aria-label="Goals"
      className={`grid gap-x-3 ${style === 'compact' ? 'gap-y-3' : 'gap-y-4'}`}
      style={{ gridTemplateColumns: `repeat(${Math.max(macros.length, 1)}, minmax(0, 1fr))` }}
    >
      {kcal && <KcalHero goal={kcal} style={style} />}
      {macros.map((goal) => (
        <MacroItem key={goal.key} goal={goal} style={style} />
      ))}
    </ul>
  )
}
