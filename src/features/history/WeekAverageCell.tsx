import { formatKcal } from '../nutrition/format'
import { isoWeekOf } from './week/weekPages'
import { formatSaved, formatSavedShort } from './week/weekFormat'

type WeekAverageCellProps = {
  /** the seven dates of the row, Monday first */
  readonly week: ReadonlyArray<string>
  readonly today: string
  /** the average calories of the counted days; null when none counts */
  readonly average: number | null
  /** calories saved over the counted days (negative: a surplus); null when unknown */
  readonly saved: number | null
  readonly tint: string
  readonly onOpenWeek: ((week: ReadonlyArray<string>) => void) | undefined
}

/** The end of a calendar row: the week's average and saved calories, a button to its page. */
export function WeekAverageCell({
  week,
  today,
  average,
  saved,
  tint,
  onOpenWeek,
}: WeekAverageCellProps) {
  const figures = (
    <>
      <span
        data-testid="week-average"
        className="block text-[11px] leading-tight font-semibold whitespace-nowrap text-label-secondary tabular-nums"
      >
        {average !== null && formatKcal(average)}
      </span>
      {saved !== null && (
        <span
          data-testid="week-saved"
          className={`block text-[10px] leading-tight font-semibold whitespace-nowrap tabular-nums ${saved >= 0 ? 'text-success' : 'text-label-secondary'}`}
        >
          {formatSavedShort(saved)}
        </span>
      )}
    </>
  )
  const cellClass = `rounded-r-2xl p-0 ${tint}`
  if (!onOpenWeek) return <td className={cellClass}>{figures}</td>

  const name = [
    `Week ${isoWeekOf(week[0] ?? '').week}`,
    average !== null && `average ${formatKcal(average)} kcal`,
    saved !== null && (saved >= 0 ? `${formatSaved(saved)} saved` : formatSaved(saved)),
  ]
    .filter(Boolean)
    .join(', ')
  return (
    <td className={cellClass}>
      {/* 44 px to touch, though the row is shorter: the extra reaches into the rows' padding */}
      <button
        type="button"
        aria-label={name}
        disabled={(week[0] ?? '') > today}
        onClick={() => onOpenWeek(week)}
        className="-my-0.5 flex h-11 w-full flex-col items-center justify-center rounded-r-2xl active:bg-fill disabled:pointer-events-none"
      >
        {figures}
      </button>
    </td>
  )
}
