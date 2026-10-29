import { Button } from '../../components/ios/Button'
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/ios/icons'
import { fromLocalDateString } from '../../lib/dates'
import type { DayStatus } from './calendar'
import { MINI_STATUS_CLASSES } from './statusClasses'
import { FIRST_YEAR, miniMonthOf, monthsOfYear } from './yearOverview'

const MONTH_NAME = new Intl.DateTimeFormat(undefined, { month: 'long' })
const MONTH_TITLE = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })

type YearOverviewProps = {
  readonly year: number
  readonly today: string
  readonly statusOf: (date: string) => DayStatus
  /** days that fade, because a filter is on and they don't match it */
  readonly fadedOf?: (date: string) => boolean
  /** the days are still on their way: the section is busy and the grid dimmed */
  readonly loading?: boolean
  readonly onOpenMonth: (month: string) => void
  readonly onChangeYear: (year: number) => void
}

/** The twelve months of a year in small, colored like the month calendar; a tap opens a month. */
export function YearOverview({
  year,
  today,
  statusOf,
  fadedOf,
  loading = false,
  onOpenMonth,
  onChangeYear,
}: YearOverviewProps) {
  const isCurrentYear = year >= Number(today.slice(0, 4))

  return (
    <section aria-busy={loading} className="mt-4 rounded-[28px] bg-bg-elevated p-4 shadow-card">
      <div className="flex items-center justify-between">
        <Button
          variant="plain"
          className="grid h-11 w-11 shrink-0 place-items-center !p-0"
          aria-label="Previous year"
          disabled={year <= FIRST_YEAR}
          onClick={() => onChangeYear(year - 1)}
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </Button>
        <h2 className="px-1 font-display text-[17px] font-bold tabular-nums">{year}</h2>
        <Button
          variant="plain"
          className="grid h-11 w-11 shrink-0 place-items-center !p-0"
          aria-label="Next year"
          disabled={isCurrentYear}
          onClick={() => onChangeYear(year + 1)}
        >
          <ChevronRightIcon className="h-5 w-5" />
        </Button>
      </div>
      <div className={`mt-2 grid grid-cols-3 gap-x-3 gap-y-3 ${loading ? 'opacity-60' : ''}`}>
        {monthsOfYear(year).map((month) => (
          <MiniMonth
            key={month}
            month={month}
            today={today}
            statusOf={statusOf}
            fadedOf={fadedOf}
            onOpen={onOpenMonth}
          />
        ))}
      </div>
    </section>
  )
}

type MiniMonthProps = {
  readonly month: string
  readonly today: string
  readonly statusOf: (date: string) => DayStatus
  readonly fadedOf?: (date: string) => boolean
  readonly onOpen: (month: string) => void
}

function MiniMonth({ month, today, statusOf, fadedOf, onOpen }: MiniMonthProps) {
  const { leadingBlanks, days } = miniMonthOf(month)
  const date = fromLocalDateString(month)

  return (
    <button
      type="button"
      aria-label={MONTH_TITLE.format(date)}
      onClick={() => onOpen(month)}
      className="flex min-w-0 flex-col items-stretch rounded-xl p-1 text-left active:bg-fill"
    >
      <span className="text-[13px] font-semibold">{MONTH_NAME.format(date)}</span>
      {/* purely visual: the month's button carries the action */}
      <span aria-hidden="true" className="mt-1 grid grid-cols-7 gap-px">
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {days.map((day) => (
          <MiniDay
            key={day}
            date={day}
            status={statusOf(day)}
            faded={fadedOf?.(day) === true}
            isToday={day === today}
            isFuture={day > today}
          />
        ))}
      </span>
    </button>
  )
}

type MiniDayProps = {
  readonly date: string
  readonly status: DayStatus
  readonly faded: boolean
  readonly isToday: boolean
  readonly isFuture: boolean
}

function MiniDay({ date, status, faded, isToday, isFuture }: MiniDayProps) {
  // a day without a verdict is a faint square, so the month keeps its shape
  const look = status === 'none' ? 'bg-label/5' : MINI_STATUS_CLASSES[status]
  return (
    <span
      data-date={date}
      data-status={status}
      data-faded={faded ? 'true' : undefined}
      className={`block aspect-square rounded-[3px] ${look} ${isToday ? 'ring-1 ring-inset ring-accent-ink' : ''} ${isFuture ? 'opacity-30' : ''} ${faded ? 'opacity-30' : ''}`}
    />
  )
}
