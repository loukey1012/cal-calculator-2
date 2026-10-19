import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from '../../components/ios/icons'
import { ListRow } from '../../components/ios/ListRow'
import { Sheet } from '../../components/ios/Sheet'
import { useLoggedWeeks } from './hooks'
import { formatMetric, formatSpan } from './trendFormat'
import { addDays, mondayOf } from './trends'
import { newerWeek, olderWeek, weekNumber, type LoggedWeek } from './trendWeeks'

const DAYS_PER_WEEK = 7

type WeekPickerProps = {
  readonly userId: string
  readonly today: string
  /** the Monday of the week shown */
  readonly monday: string
  readonly onChange: (monday: string) => void
}

const spanOf = (monday: string) => formatSpan(monday, addDays(monday, DAYS_PER_WEEK - 1))

/**
 * The calendar week the Week view shows: ‹ › step to the next week with an entry, the week
 * itself opens a list of all of them.
 */
export function WeekPicker({ userId, today, monday, onChange }: WeekPickerProps) {
  const weeks = useLoggedWeeks(userId, today)
  const [listOpen, setListOpen] = useState(false)
  const list = weeks.data ?? []
  const older = olderWeek(list, monday)
  const newer = newerWeek(list, monday)
  const isCurrent = monday === mondayOf(today)

  return (
    <div className="mt-3 flex items-center gap-1">
      <Button
        variant="plain"
        aria-label="Earlier week"
        disabled={older === null}
        onClick={() => older && onChange(older)}
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </Button>
      <button
        type="button"
        onClick={() => setListOpen(true)}
        className="min-w-0 flex-1 rounded-2xl bg-bg-elevated px-3 py-1.5 text-center shadow-card active:opacity-60"
      >
        <span className="block text-[15px] font-bold">Week {weekNumber(monday)}</span>
        <span className="block truncate text-[12px] font-semibold text-label-secondary">
          {isCurrent ? 'This week' : spanOf(monday)}
        </span>
      </button>
      <Button
        variant="plain"
        aria-label="Later week"
        disabled={newer === null}
        onClick={() => newer && onChange(newer)}
      >
        <ChevronRightIcon className="h-5 w-5" />
      </Button>
      <Sheet open={listOpen} onClose={() => setListOpen(false)} title="Weeks">
        <WeekList
          weeks={list}
          today={today}
          selected={monday}
          onPick={(picked) => {
            onChange(picked)
            setListOpen(false)
          }}
        />
      </Sheet>
    </div>
  )
}

type WeekListProps = {
  readonly weeks: readonly LoggedWeek[]
  readonly today: string
  readonly selected: string
  readonly onPick: (monday: string) => void
}

/** Every week with an entry, newest first, with its Ø calories of the days that count. */
function WeekList({ weeks, today, selected, onPick }: WeekListProps) {
  const current = mondayOf(today)
  return (
    <GroupedSection footer="Weeks with at least one entry. Ø counts only complete days.">
      {weeks.map((week) => (
        <ListRow
          key={week.monday}
          leading={
            <CheckIcon
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 text-accent-ink ${week.monday === selected ? '' : 'invisible'}`}
            />
          }
          title={`Week ${weekNumber(week.monday)}`}
          subtitle={week.monday === current ? 'This week' : spanOf(week.monday)}
          detail={week.average === null ? '–' : `Ø ${formatMetric('kcal', week.average)}`}
          onClick={() => onPick(week.monday)}
        />
      ))}
    </GroupedSection>
  )
}
