import type { ReactNode } from 'react'
import { ScaleSymbol, StarSymbol, WineGlassSymbol } from './calendarSymbols'

const CIRCLE = 'flex h-4 w-4 shrink-0 items-center justify-center rounded-full'
const DASHED = 'border-2 border-dashed'

type KeyEntry = { readonly label: string; readonly sample: ReactNode }

// the same classes as the cells (MonthCalendar), so a change there shows here too
const ENTRIES: readonly KeyEntry[] = [
  { label: 'Within goal (≤ 10 % over)', sample: <span className={`${CIRCLE} bg-success/25`} /> },
  { label: 'More than 10 % over', sample: <span className={`${CIRCLE} day-over`} /> },
  { label: 'More than 300 kcal over', sample: <span className={`${CIRCLE} day-well-over`} /> },
  {
    label: 'Cheat day',
    sample: <span className={`${CIRCLE} ${DASHED} border-label-secondary/60`} />,
  },
  {
    label: 'Alcohol day',
    sample: (
      <span className={`${CIRCLE} ${DASHED} border-alcohol text-alcohol`}>
        <WineGlassSymbol className="h-2.5 w-2.5" />
      </span>
    ),
  },
  {
    label: 'Cheat meal',
    sample: <StarSymbol className="h-3.5 w-3.5 shrink-0 text-star" />,
  },
  {
    label: 'Lunch or dinner missing',
    sample: (
      <span
        className={`${CIRCLE} bg-missing text-[10px] leading-none font-extrabold text-on-missing`}
      >
        !
      </span>
    ),
  },
  { label: 'Has a note', sample: <span className="h-1.5 w-1.5 rounded-full bg-accent-ink" /> },
  {
    label: 'Weigh-in',
    sample: <ScaleSymbol className="h-3.5 w-3.5 shrink-0 text-label-secondary" />,
  },
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
