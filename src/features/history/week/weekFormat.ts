import { fromLocalDateString } from '../../../lib/dates'
import { formatKcal } from '../../nutrition/format'

const WEEKDAY_DAY = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

/** e.g. "Mon, Oct 19 – Sun, Oct 25" */
export function formatWeekRange(first: string, last: string): string {
  return `${WEEKDAY_DAY.format(fromLocalDateString(first))} – ${WEEKDAY_DAY.format(fromLocalDateString(last))}`
}

/** "3,090 kcal", or "1,200 kcal surplus" when more was eaten than burned. */
export function formatSaved(saved: number): string {
  return saved >= 0 ? `${formatKcal(saved)} kcal` : `${formatKcal(-saved)} kcal surplus`
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}
