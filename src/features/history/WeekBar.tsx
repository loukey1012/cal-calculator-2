import { ChevronRightIcon } from '../../components/ios/icons'
import { formatKcal } from '../nutrition/format'
import { formatSaved } from './week/weekFormat'
import { isoWeekOf } from './week/weekPages'

type WeekBarProps = {
  /** the seven dates of the week, Monday first */
  readonly week: ReadonlyArray<string>
  /** null while the week's days are still loading */
  readonly figures: {
    /** the average calories of the counted days; null when none counts */
    readonly average: number | null
    /** calories saved over the counted days (negative: a surplus); null without calories burned */
    readonly saved: number | null
  } | null
  readonly onOpen: (week: ReadonlyArray<string>) => void
}

/** The text of the bar, worded like the week page: "Week 43 · Ø 1,930 kcal · 2,100 kcal saved". */
function weekBarText(weekNumber: number, figures: WeekBarProps['figures']): string {
  const parts = [`Week ${weekNumber}`]
  if (figures === null) return parts[0] ?? ''
  if (figures.average === null) {
    parts.push('no counted days')
  } else {
    parts.push(`Ø ${formatKcal(figures.average)} kcal`)
    if (figures.saved !== null) {
      parts.push(
        figures.saved >= 0 ? `${formatSaved(figures.saved)} saved` : formatSaved(figures.saved),
      )
    }
  }
  return parts.join(' · ')
}

/** The name for a screen reader: "Ø" is spelled out. */
function weekBarLabel(text: string): string {
  return text.replaceAll(' · ', ', ').replace('Ø', 'average')
}

/** Under the calendar grid: one row with the figures of a week, a button to its page. */
export function WeekBar({ week, figures, onOpen }: WeekBarProps) {
  const text = weekBarText(isoWeekOf(week[0] ?? '').week, figures)
  return (
    <button
      type="button"
      aria-label={weekBarLabel(text)}
      onClick={() => onOpen(week)}
      className="mt-1 flex min-h-11 w-full items-center justify-between gap-2 border-t border-separator px-2 py-2 text-left text-[14px] font-semibold active:bg-fill"
    >
      <span aria-hidden="true" className="min-w-0 tabular-nums">
        {text}
      </span>
      <ChevronRightIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-label-secondary" />
    </button>
  )
}
