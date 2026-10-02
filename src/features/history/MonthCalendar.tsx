import { Button } from '../../components/ios/Button'
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
}

const STATUS_CLASSES: Record<DayStatus, string> = {
  none: 'text-label',
  logged: 'bg-fill text-label',
  onTarget: 'bg-[#30d158]/25 text-label',
  over: 'bg-[#ff375f]/25 text-label',
}

type MonthCalendarProps = {
  /** YYYY-MM-01 */
  readonly month: string
  readonly today: string
  readonly statusOf: (date: string) => DayStatus
  readonly onSelectDay: (date: string) => void
  readonly onChangeMonth: (month: string) => void
}

export function MonthCalendar({
  month,
  today,
  statusOf,
  onSelectDay,
  onChangeMonth,
}: MonthCalendarProps) {
  const title = new Intl.DateTimeFormat(undefined, MONTH_TITLE).format(fromLocalDateString(month))
  const isCurrentMonth = month >= monthStart(today)

  return (
    <section className="mt-4 rounded-xl bg-bg-elevated p-3">
      <div className="flex items-center justify-between">
        <Button
          variant="plain"
          aria-label="Previous month"
          onClick={() => onChangeMonth(addMonths(month, -1))}
        >
          ‹
        </Button>
        <h2 className="text-[17px] font-semibold">{title}</h2>
        <Button
          variant="plain"
          aria-label="Next month"
          disabled={isCurrentMonth}
          onClick={() => onChangeMonth(addMonths(month, 1))}
        >
          ›
        </Button>
      </div>
      <table className="mt-1 w-full table-fixed text-center">
        <thead>
          <tr>
            {WEEKDAYS.map((weekday) => (
              <th key={weekday} className="pb-1 text-[12px] font-medium text-label-secondary">
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
  readonly status: DayStatus
  readonly onSelect: (date: string) => void
}

function DayButton({ date, today, status, onSelect }: DayButtonProps) {
  const isToday = date === today
  const label = new Intl.DateTimeFormat(undefined, DAY_LABEL).format(fromLocalDateString(date))
  return (
    <button
      type="button"
      data-status={status}
      aria-current={isToday ? 'date' : undefined}
      aria-label={`${isToday ? 'Today, ' : ''}${label}${STATUS_TEXT[status]}`}
      disabled={date > today}
      onClick={() => onSelect(date)}
      className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[15px] disabled:opacity-30 ${STATUS_CLASSES[status]} ${
        isToday ? 'ring-2 ring-accent' : ''
      }`}
    >
      {Number(date.slice(8))}
    </button>
  )
}
