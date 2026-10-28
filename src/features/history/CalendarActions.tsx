import { CalendarOptionsMenu } from './CalendarOptionsMenu'
import { FilterMenu } from './FilterMenu'
import type { MonthFilter } from './monthStats'

type CalendarActionsProps = {
  readonly filter: MonthFilter | null
  readonly onChangeFilter: (filter: MonthFilter | null) => void
  readonly keyShown: boolean
  readonly onChangeKeyShown: (shown: boolean) => void
  /** shows the year overview; left out while the year overview is what is shown */
  readonly onShowYear?: () => void
  readonly onOpenThisWeek?: () => void
  readonly thisWeekDetail?: string
}

/** The filter and ⋯ buttons of the calendar, beside the large History title. */
export function CalendarActions({
  filter,
  onChangeFilter,
  keyShown,
  onChangeKeyShown,
  onShowYear,
  onOpenThisWeek,
  thisWeekDetail,
}: CalendarActionsProps) {
  return (
    <div className="-my-1 flex shrink-0 items-center">
      <FilterMenu filter={filter} onChange={onChangeFilter} />
      <CalendarOptionsMenu
        keyShown={keyShown}
        onChangeKeyShown={onChangeKeyShown}
        onShowYear={onShowYear}
        onOpenThisWeek={onOpenThisWeek}
        thisWeekDetail={thisWeekDetail}
      />
    </div>
  )
}
