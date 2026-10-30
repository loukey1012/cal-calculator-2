import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Button } from '../../components/ios/Button'
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '../../components/ios/icons'
import { fromLocalDateString } from '../../lib/dates'
import { addMonths, monthStart, monthWeeks, type DayMarks, type DayStatus } from './calendar'
import { DialSymbol, DumbbellSymbol, HeartSymbol, LinesSymbol } from './calendarSymbols'
import { LeftOutMark } from './LeftOutMark'
import { STATUS_CLASSES, STATUS_TEXT } from './statusClasses'
import { useMonthPress } from './useMonthPress'

// a known Monday, to name the weekdays in the device language
const A_MONDAY = new Date(2024, 0, 1)
const WEEKDAYS = Array.from({ length: 7 }, (_, index) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(
    new Date(A_MONDAY.getFullYear(), A_MONDAY.getMonth(), A_MONDAY.getDate() + index),
  ),
)
const MONTH_TITLE = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const DAY_LABEL = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' })

type MonthCalendarProps = {
  /** YYYY-MM-01 */
  readonly month: string
  readonly today: string
  /** the day shown below the calendar, if any */
  readonly selectedDay: string | null
  readonly statusOf: (date: string) => DayStatus
  readonly marksOf: (date: string) => DayMarks
  /** days that fade, because a filter is on and they don't match it */
  readonly fadedOf?: (date: string) => boolean
  /** shown under the grid inside the card: the week bar */
  readonly footer?: ReactNode
  readonly onSelectDay: (date: string) => void
  readonly onChangeMonth: (month: string) => void
  /** the month title turns into a button that shows the year overview */
  readonly onShowYear?: () => void
  /**
   * the card shown for a held day; it calls `close` when it wants to go away. `pinned`: the
   * finger has lifted and the card stays until it is dismissed, so its buttons can be tapped.
   */
  /** whose calendar it is: a card held for someone else closes when this changes */
  readonly quickLookScope?: string
  /** false while the page is mounted but not the one shown (another tab, a page on top) */
  readonly pageShown?: boolean
  readonly renderQuickLook?: (date: string, close: () => void, pinned: boolean) => ReactNode
}

export function MonthCalendar({
  month,
  today,
  selectedDay,
  statusOf,
  marksOf,
  fadedOf,
  footer,
  onSelectDay,
  onChangeMonth,
  onShowYear,
  quickLookScope,
  pageShown = true,
  renderQuickLook,
}: MonthCalendarProps) {
  const [held, setHeld] = useState<{
    date: string
    pinned: boolean
    scope: string | undefined
  } | null>(null)
  const [slide, setSlide] = useState({ month, direction: 'none' as 'none' | 'next' | 'previous' })
  const isCurrentMonth = month >= monthStart(today)
  const onSelectRef = useRef(onSelectDay)
  useEffect(() => {
    onSelectRef.current = onSelectDay
  })
  const selectDay = useCallback((date: string) => onSelectRef.current(date), [])
  const weeks = useMemo(() => monthWeeks(month), [month])

  // the new month slides in from the side it lies on
  if (slide.month !== month) {
    setSlide({ month, direction: month > slide.month ? 'next' : 'previous' })
    if (held !== null) setHeld(null)
  }
  // the card is drawn in the body: it goes when this page isn't the shown one (another tab, a
  // page on top) or when it is another person's calendar
  if (held !== null && (!pageShown || held.scope !== quickLookScope)) setHeld(null)

  const closeQuickLook = useCallback(() => setHeld(null), [])
  const openQuickLook = useCallback(
    (date: string) => setHeld({ date, pinned: false, scope: quickLookScope }),
    [quickLookScope],
  )
  // lifting the finger keeps the card open; a press that never opened one changes nothing
  const pinQuickLook = useCallback((heldOpen: boolean) => {
    if (heldOpen) setHeld((current) => (current ? { ...current, pinned: true } : current))
  }, [])
  const { onPointerDown, onClickCapture } = useMonthPress({
    month,
    isCurrentMonth,
    onChangeMonth,
    onHold: renderQuickLook ? openQuickLook : undefined,
    onRelease: pinQuickLook,
  })

  const title = MONTH_TITLE.format(fromLocalDateString(month))
  const showYearHintId = useId()

  return (
    <section className="mt-4 rounded-[28px] bg-bg-elevated p-2 shadow-card">
      <div className="flex items-center justify-between">
        <Button
          variant="plain"
          className="grid h-11 w-11 shrink-0 place-items-center !p-0"
          aria-label="Previous month"
          onClick={() => onChangeMonth(addMonths(month, -1))}
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 flex-col items-center px-1">
          {/* the button inside the heading is one stop for a screen reader, named by the title; its
              44 px touch target reaches past the heading's own height (negative margin) */}
          <h2 className="-my-2.5 max-w-full font-display text-[17px] font-bold whitespace-nowrap">
            {onShowYear ? (
              <button
                type="button"
                aria-describedby={showYearHintId}
                onClick={onShowYear}
                className="flex h-11 max-w-full items-center gap-1 rounded-lg px-2 font-[inherit] active:bg-fill"
              >
                <span className="truncate">{title}</span>
                <ChevronDownIcon
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-label-secondary"
                />
              </button>
            ) : (
              <span className="block truncate">{title}</span>
            )}
          </h2>
          {onShowYear && (
            <span id={showYearHintId} className="sr-only">
              Show year
            </span>
          )}
          {month !== monthStart(today) && (
            <button
              type="button"
              onClick={() => onChangeMonth(monthStart(today))}
              className="mt-0.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-[12px] font-bold text-accent-ink active:opacity-60"
            >
              Today
            </button>
          )}
        </div>
        <Button
          variant="plain"
          className="grid h-11 w-11 shrink-0 place-items-center !p-0"
          aria-label="Next month"
          disabled={isCurrentMonth}
          onClick={() => onChangeMonth(addMonths(month, 1))}
        >
          <ChevronRightIcon className="h-5 w-5" />
        </Button>
      </div>
      {/* sideways drags here turn the month: they never switch tabs or go back (data-swipe-lock) */}
      <div
        key={month}
        data-swipe-lock=""
        data-slide={slide.direction}
        className="month-slide mt-1 touch-pan-y select-none [-webkit-touch-callout:none]"
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
        onContextMenu={(event) => event.preventDefault()}
      >
        <table className="w-full table-fixed text-center">
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
            {weeks.map((week) => {
              const isCurrentWeek = week.includes(today)
              // the current week's row is tinted: the cells carry it, so its ends can be rounded
              const tint = isCurrentWeek ? 'bg-accent/10' : ''
              return (
                <tr key={week[0]} data-testid="week-row" data-current={isCurrentWeek}>
                  {week.map((date, dayIndex) => (
                    <td
                      key={date}
                      className={`p-0.5 ${tint} ${dayIndex === 0 ? 'rounded-l-2xl' : ''} ${dayIndex === week.length - 1 ? 'rounded-r-2xl' : ''}`}
                    >
                      {/* the days of the neighbouring months only feed the week average */}
                      {date.startsWith(month.slice(0, 7)) && (
                        <DayButton
                          date={date}
                          today={today}
                          selected={date === selectedDay}
                          status={statusOf(date)}
                          faded={fadedOf?.(date) === true}
                          {...marksOf(date)}
                          onSelect={selectDay}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {footer}
      {held && renderQuickLook?.(held.date, closeQuickLook, held.pinned)}
    </section>
  )
}

type DayButtonProps = DayMarks & {
  readonly date: string
  readonly today: string
  readonly selected: boolean
  readonly status: DayStatus
  readonly faded: boolean
  readonly onSelect: (date: string) => void
}

/** The text a screen reader adds to the date for what the cell shows. */
function marksText({ hasNote, weighed, estimated, gym, sex }: DayMarks): string {
  return `${hasNote ? ', has a note' : ''}${weighed ? ', weigh-in' : ''}${estimated ? ', estimated calories' : ''}${gym ? ', gym' : ''}${sex ? ', sex' : ''}`
}

/** The shared look of the bottom row's symbols: 9 px, stroke 1.6. */
function bottomMark(color: string) {
  return { className: `h-[9px] w-[9px] shrink-0 ${color}`, strokeWidth: '1.6' }
}

// props are primitives and `onSelect` is stable, so a cell only renders again when it changes
const DayButton = memo(function DayButton({
  date,
  today,
  selected,
  status,
  faded,
  hasNote,
  weighed,
  estimated,
  gym,
  sex,
  onSelect,
}: DayButtonProps) {
  const isToday = date === today
  const isFuture = date > today
  const label = DAY_LABEL.format(fromLocalDateString(date))
  // marks keep their own colors, except on the filled selected day, where they use its text color
  const markColor = (own: string) => (selected ? 'text-on-accent' : own)
  return (
    <button
      type="button"
      data-date={date}
      data-status={status}
      data-faded={faded ? 'true' : undefined}
      aria-current={isToday ? 'date' : undefined}
      aria-pressed={selected}
      aria-label={`${isToday ? 'Today, ' : ''}${label}${STATUS_TEXT[status]}${marksText({ hasNote, weighed, estimated, gym, sex })}`}
      // a future day takes no touches itself, so a swipe starting on it still reaches the grid
      disabled={isFuture}
      onClick={() => onSelect(date)}
      className={`relative mx-auto flex h-[54px] w-11 items-start justify-center rounded-[14px] pt-[10px] text-[15px] leading-[22px] font-semibold ${isFuture ? 'pointer-events-none opacity-30' : ''} ${faded ? 'opacity-30' : ''} ${
        // the selected day is filled with the accent color; today is only a ring around its fill
        selected
          ? 'accent-edge bg-accent font-extrabold text-on-accent'
          : `${STATUS_CLASSES[status]} ${isToday ? 'ring-2 ring-accent-ink ring-offset-0' : ''}`
      }`}
    >
      {Number(date.slice(8))}
      {/* top right: why the day doesn't count, if it doesn't (one mark, by the status priority) */}
      <LeftOutMark status={status} selected={selected} className="absolute top-[3px] right-[3px]" />
      {estimated && (
        <span
          aria-hidden="true"
          data-testid="estimate-mark"
          className={`absolute top-[3px] left-[5px] text-[11px] leading-none font-bold ${markColor('text-label-secondary')}`}
        >
          ~
        </span>
      )}
      {/* one centred bottom row: weigh-in, note, gym, sex */}
      {(weighed || hasNote || gym || sex) && (
        <span
          data-testid="day-marks-row"
          className="absolute inset-x-[2px] bottom-[4px] flex justify-center gap-px"
        >
          {weighed && (
            <DialSymbol data-testid="weigh-in-mark" {...bottomMark(markColor('text-weigh'))} />
          )}
          {hasNote && (
            <LinesSymbol data-testid="note-dot" {...bottomMark(markColor('text-note'))} />
          )}
          {gym && <DumbbellSymbol data-testid="gym-mark" {...bottomMark(markColor('text-gym'))} />}
          {sex && <HeartSymbol data-testid="sex-mark" {...bottomMark(markColor('text-heart'))} />}
        </span>
      )}
    </button>
  )
})
