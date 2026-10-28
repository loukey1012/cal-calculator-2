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
}

/** The ⋯ button of the calendar: its options (the key, the year overview). */
export function CalendarOptionsMenu({
  keyShown,
  onChangeKeyShown,
  onShowYear,
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
