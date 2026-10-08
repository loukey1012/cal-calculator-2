import { useState } from 'react'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { fromLocalDateString } from '../../lib/dates'
import { toUserMessage } from '../../lib/errors'
import { useLatestWeightChangeError, useWeights } from './hooks'
import { formatKg, weightOn, type WeightEntry } from './weight'
import { WeightSheet } from './WeightSheet'

const SINCE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
}

type DayWeightProps = {
  readonly userId: string
  readonly date: string
  readonly today: string
  /** only your own weight can be changed */
  readonly isOwnDay: boolean
}

function sinceText(current: WeightEntry, date: string): string {
  if (current.date === date) return 'Entered on this day'
  const since = new Intl.DateTimeFormat(undefined, SINCE_FORMAT).format(
    fromLocalDateString(current.date),
  )
  return `Since ${since}`
}

/** A day's weight in History: the latest entry up to that day; tap to set this day's. */
export function DayWeight({ userId, date, today, isOwnDay }: DayWeightProps) {
  const weights = useWeights(userId)
  const changeError = useLatestWeightChangeError(userId)
  const [editing, setEditing] = useState(false)
  const entries = weights.data ?? []
  const current = weightOn(entries, date)

  return (
    <>
      <GroupedSection>
        <ListRow
          title="Weight"
          subtitle={current ? sinceText(current, date) : 'Nothing entered yet'}
          detail={current ? formatKg(current.weightKg) : isOwnDay ? 'Add weight' : '–'}
          onClick={isOwnDay && !weights.isPending ? () => setEditing(true) : undefined}
        />
      </GroupedSection>
      {weights.isError && <ErrorBanner message={toUserMessage(weights.error)} />}
      {changeError && (
        <ErrorBanner message={`Couldn’t save your weight. ${toUserMessage(changeError)}`} />
      )}
      {editing && (
        <WeightSheet
          userId={userId}
          entries={entries}
          date={date}
          today={today}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}
