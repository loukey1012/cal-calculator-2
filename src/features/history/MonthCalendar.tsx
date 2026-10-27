import { Button } from '../../components/ios/Button'
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/ios/icons'
import { fromLocalDateString } from '../../lib/dates'
import { addMonths, monthGrid, monthStart, type DayStatus } from './calendar'

// a known Monday, to name the weekdays in the device language
const A_MONDAY = new Date(2024, 0, 1)
const WEEKDAYS = Array.from({ length: 7 }, (_, index) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(
    new Date(A_MONDAY.getFullYear(), A_MONDAY.getMonth(), A_MONDAY.getDate() + index),
  ),
)
const MONTH_TITLE: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }
const DAY_LABEL: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' }

const STATUS_TEXT: Record<DayStatus, string> = {
  none: '',
  logged: ', logged',
  onTarget: ', within goal',
  over: ', over goal',
  wellOver: ', well over goal',
  cheatDay: ', cheat day',
  alcoholDay: ', alcohol day',
  cheatMeal: ', cheat meal',
  missing: ', lunch or dinner missing',
}

const STATUS_CLASSES: Record<DayStatus, string> = {
  none: 'text-label',
  logged: 'bg-fill text-label',
  onTarget: 'bg-success/25 text-label',
  // the rings' over colors (Appearance), or red when those are switched off
  over: 'day-over text-label',
  wellOver: 'day-well-over text-label',
  // left out of the averages: an outline instead of a fill
  cheatDay: 'border-2 border-dashed border-label-secondary/60 text-label-secondary',
  // the same outline until it gets a symbol of its own
  alcoholDay: 'border-2 border-dashed border-label-secondary/60 text-label-secondary',
  cheatMeal: 'bg-fill text-label',
  // not judged against the goal: it doesn't count until lunch and dinner are logged
  missing: 'bg-fill text-label',
}

type MonthCalendarProps = {
  /** YYYY-MM-01 */
  readonly month: string
  readonly today: string
  /** the day shown below the calendar, if any */
  readonly selectedDay: string | null
  readonly statusOf: (date: string) => DayStatus
  readonly onSelectDay: (date: string) => void
  readonly onChangeMonth: (month: string) => void
}

export function MonthCalendar({
  month,
  today,
  selectedDay,
  statusOf,
  onSelectDay,
  onChangeMonth,
}: MonthCalendarProps) {
  const title = new Intl.DateTimeFormat(undefined, MONTH_TITLE).format(fromLocalDateString(month))
  const isCurrentMonth = month >= monthStart(today)

  return (
    <section className="mt-4 rounded-[28px] bg-bg-elevated p-4 shadow-card">
      <div className="flex items-center justify-between">
        <Button
          variant="plain"
          aria-label="Previous month"
          onClick={() => onChangeMonth(addMonths(month, -1))}
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </Button>
        <h2 className="font-display text-[17px] font-bold">{title}</h2>
        <Button
          variant="plain"
          aria-label="Next month"
          disabled={isCurrentMonth}
          onClick={() => onChangeMonth(addMonths(month, 1))}
        >
          <ChevronRightIcon className="h-5 w-5" />
        </Button>
      </div>
      <table className="mt-1 w-full table-fixed text-center">
        <thead>
          <tr>
            {WEEKDAYS.map((weekday) => (
              <th key={weekday} className="caption pb-1 text-[11px]">
                {weekday}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthGrid(month).map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map((date, dayIndex) => (
                <td key={date ?? `blank-${dayIndex}`} className="p-0.5">
                  {date && (
                    <DayButton
                      date={date}
                      today={today}
                      selected={date === selectedDay}
                      status={statusOf(date)}
                      onSelect={onSelectDay}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

type DayButtonProps = {
  readonly date: string
  readonly today: string
  readonly selected: boolean
  readonly status: DayStatus
  readonly onSelect: (date: string) => void
}

function DayButton({ date, today, selected, status, onSelect }: DayButtonProps) {
  const isToday = date === today
  const label = new Intl.DateTimeFormat(undefined, DAY_LABEL).format(fromLocalDateString(date))
  return (
    <button
      type="button"
      data-status={status}
      aria-current={isToday ? 'date' : undefined}
      aria-pressed={selected}
      aria-label={`${isToday ? 'Today, ' : ''}${label}${STATUS_TEXT[status]}`}
      disabled={date > today}
      onClick={() => onSelect(date)}
      className={`relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-semibold disabled:opacity-30 ${
        // the selected day is filled with the accent color
        selected ? 'accent-edge bg-accent font-extrabold text-on-accent' : STATUS_CLASSES[status]
      } ${isToday ? 'ring-2 ring-accent-ink' : ''}`}
    >
      {Number(date.slice(8))}
      {/* a cheat meal: logged, plus a dot for that meal */}
      {status === 'cheatMeal' && (
        <span
          aria-hidden="true"
          className={`absolute bottom-1 h-1 w-1 rounded-full ${selected ? 'bg-on-accent' : 'bg-label-secondary'}`}
        />
      )}
      {/* a meal missing: an amber dot at the top right, visible at a glance */}
      {status === 'missing' && (
        <span
          aria-hidden="true"
          data-testid="missing-dot"
          className="absolute top-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-bg-elevated"
        />
      )}
    </button>
  )
}
