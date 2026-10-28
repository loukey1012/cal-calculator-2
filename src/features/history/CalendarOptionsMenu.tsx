import { useState } from 'react'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { EllipsisIcon } from '../../components/ios/icons'
import { ListRow } from '../../components/ios/ListRow'
import { Sheet } from '../../components/ios/Sheet'

type CalendarOptionsMenuProps = {
  readonly keyShown: boolean
  readonly onChangeKeyShown: (shown: boolean) => void
  /** shows the year overview; left out where the year overview is what is shown */
  readonly onShowYear?: () => void
  /** opens the running week's page; the row is left out where that is not offered */
  readonly onOpenThisWeek?: () => void
  /** e.g. "750 kcal saved so far"; none while unknown */
  readonly thisWeekDetail?: string
}

/** The ⋯ button of the calendar: its options (this week, the key, the year overview). */
export function CalendarOptionsMenu({
  keyShown,
  onChangeKeyShown,
  onShowYear,
  onOpenThisWeek,
  thisWeekDetail,
}: CalendarOptionsMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        aria-label="Calendar options"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-label-secondary active:opacity-60"
      >
        <EllipsisIcon className="h-5 w-5" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Calendar">
        <GroupedSection>
          {onOpenThisWeek && (
            <ListRow
              title="This week"
              detail={thisWeekDetail}
              onClick={() => {
                onOpenThisWeek()
                setOpen(false)
              }}
            />
          )}
          {onShowYear && (
            <ListRow
              title="Year overview"
              hideChevron
              onClick={() => {
                onShowYear()
                setOpen(false)
              }}
            />
          )}
          <ListRow
            title={keyShown ? 'Hide key' : 'Show key'}
            hideChevron
            onClick={() => {
              onChangeKeyShown(!keyShown)
              setOpen(false)
            }}
          />
        </GroupedSection>
      </Sheet>
    </>
  )
}
