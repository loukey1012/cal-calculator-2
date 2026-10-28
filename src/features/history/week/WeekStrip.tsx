import { fromLocalDateString } from '../../../lib/dates'
import { formatKcal } from '../../nutrition/format'
import type { Goal } from '../../nutrition/goals'
import { dayStatus } from '../calendar'
import { StarSymbol, WineGlassSymbol } from '../calendarSymbols'
import { isOutlined, STATUS_CLASSES, STATUS_TEXT } from '../statusClasses'
import type { WeekDay } from './weekStats'

const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const FULL_DAY = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

type WeekStripProps = {
  readonly dates: readonly string[]
  readonly byDate: ReadonlyMap<string, WeekDay>
  readonly goals: readonly Goal[]
  readonly today: string
  /** what counted, e.g. "5 counted · 1 alcohol day" */
  readonly counting: readonly string[]
  readonly onOpenDay: (date: string) => void
}

/** Monday to Sunday in the calendar's colors, each opening its day, and what counted. */
export function WeekStrip({ dates, byDate, goals, today, counting, onOpenDay }: WeekStripProps) {
  return (
    <section className="glass-surface mt-4 rounded-3xl bg-bg-elevated px-3 py-4 shadow-card">
      <ul aria-label="Days of the week" className="grid grid-cols-7 gap-1">
        {dates.map((date) => (
          <li key={date}>
            <DayCell
              date={date}
              total={byDate.get(date)}
              goals={goals}
              today={today}
              onOpen={onOpenDay}
            />
          </li>
        ))}
      </ul>
      <p className="mt-3 px-1 text-center text-[13px] text-label-secondary">
        {counting.join(' · ')}
      </p>
    </section>
  )
}

type DayCellProps = {
  readonly date: string
  readonly total: WeekDay | undefined
  readonly goals: readonly Goal[]
  readonly today: string
  readonly onOpen: (date: string) => void
}

function DayCell({ date, total, goals, today, onOpen }: DayCellProps) {
  const status = dayStatus(date, total, goals, today)
  const left = status === 'cheatDay' || status === 'alcoholDay' || status === 'cheatMeal'
  // calories of a day that is left out are not shown: they are not part of anything
  const kcal = total && total.mealCount > 0 && !left ? formatKcal(total.kcal) : null
  const day = fromLocalDateString(date)
  const isFuture = date > today
  return (
    <button
      type="button"
      data-date={date}
      data-status={status}
      aria-label={`${date === today ? 'Today, ' : ''}${FULL_DAY.format(day)}${STATUS_TEXT[status]}${kcal ? `, ${kcal} kcal` : ''}`}
      disabled={isFuture}
      onClick={() => onOpen(date)}
      className={`flex min-h-[76px] w-full flex-col items-center gap-1 rounded-2xl py-1 active:bg-fill ${isFuture ? 'opacity-30' : ''}`}
    >
      <span className="caption text-[11px]">{WEEKDAY.format(day)}</span>
      <span
        className={`relative flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-semibold ${STATUS_CLASSES[status]} ${isOutlined(status) ? 'border-2' : ''} ${date === today ? 'ring-2 ring-accent-ink ring-offset-1 ring-offset-bg-elevated' : ''}`}
      >
        {Number(date.slice(8))}
        {status === 'alcoholDay' && (
          <WineGlassSymbol className="absolute -top-0.5 -right-0.5 h-3 w-3 text-alcohol" />
        )}
        {status === 'cheatMeal' && (
          <StarSymbol className="absolute -top-0.5 -right-0.5 h-3 w-3 text-star" />
        )}
        {status === 'missing' && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-missing text-[9px] leading-none font-extrabold text-on-missing"
          >
            !
          </span>
        )}
      </span>
      <span className="text-[10px] font-semibold text-label-secondary tabular-nums">
        {kcal ?? ' '}
      </span>
    </button>
  )
}
