import type { ReactNode } from 'react'
import { DialSymbol, HeartSymbol, DumbbellSymbol, LinesSymbol } from './calendarSymbols'
import { LeftOutMark } from './LeftOutMark'

const CIRCLE = 'flex h-4 w-4 shrink-0 items-center justify-center rounded-full'
const SYMBOL = 'h-3.5 w-3.5 shrink-0'

type KeyEntry = { readonly label: string; readonly sample: ReactNode }

// the same classes and marks as the cells (MonthCalendar), so a change there shows here too
const ENTRIES: readonly KeyEntry[] = [
  { label: 'Within goal (≤ 10 % over)', sample: <span className={`${CIRCLE} bg-success/25`} /> },
  { label: 'More than 10 % over', sample: <span className={`${CIRCLE} day-over`} /> },
  { label: 'More than 300 kcal over', sample: <span className={`${CIRCLE} day-well-over`} /> },
  { label: 'Day that does not count', sample: <span className={`${CIRCLE} bg-fill`} /> },
  { label: 'Cheat day', sample: <LeftOutMark status="cheatDay" size="key" /> },
  { label: 'Alcohol day', sample: <LeftOutMark status="alcoholDay" size="key" /> },
  { label: 'Lunch or dinner missing', sample: <LeftOutMark status="missing" size="key" /> },
  { label: 'Cheat meal', sample: <LeftOutMark status="cheatMeal" size="key" /> },
  {
    label: 'Has a note',
    sample: <LinesSymbol strokeWidth="1.6" className={`${SYMBOL} text-note`} />,
  },
  {
    label: 'Weigh-in',
    sample: <DialSymbol strokeWidth="1.6" className={`${SYMBOL} text-weigh`} />,
  },
  { label: 'Gym', sample: <DumbbellSymbol strokeWidth="1.6" className={`${SYMBOL} text-gym`} /> },
  { label: 'Sex', sample: <HeartSymbol strokeWidth="1.6" className={`${SYMBOL} text-heart`} /> },
  {
    label: 'Estimated calories',
    sample: <span className="text-[13px] leading-none font-bold text-label-secondary">~</span>,
  },
]

/** What the colors and symbols of the calendar mean; shown or hidden from the options menu. */
export function CalendarKey() {
  return (
    <div className="mt-3 rounded-[20px] bg-bg-elevated px-4 py-3 shadow-card">
      <h3 className="caption">Key</h3>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px] text-label-secondary">
        {ENTRIES.map(({ label, sample }) => (
          <li key={label} className="flex items-center gap-2">
            <span aria-hidden="true" className="flex w-4 shrink-0 justify-center">
              {sample}
            </span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}
