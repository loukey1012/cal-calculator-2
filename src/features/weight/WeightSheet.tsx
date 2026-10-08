import { useState, type FormEvent } from 'react'
import { InputRow } from '../../components/ios/FormRows'
import { Button } from '../../components/ios/Button'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { Sheet } from '../../components/ios/Sheet'
import { useWeightChange } from './hooks'
import { parseWeight, weightOn, type WeightEntry } from './weight'

const FORM_ID = 'weight-form'

type WeightSheetProps = {
  readonly userId: string
  readonly entries: readonly WeightEntry[]
  /** the day it opens on; any day up to today can be chosen */
  readonly date: string
  readonly today: string
  readonly onClose: () => void
}

/** Sets (or deletes) the weight of one day; it then counts until the next entry. */
export function WeightSheet({ userId, entries, date, today, onClose }: WeightSheetProps) {
  const change = useWeightChange(userId)
  const [day, setDay] = useState(date)
  const [weight, setWeight] = useState(() => {
    const current = weightOn(entries, date)
    return current ? String(current.weightKg) : ''
  })
  const [error, setError] = useState<string | null>(null)
  const ownEntry = entries.find((entry) => entry.date === day)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseWeight(weight)
    if (!parsed.ok) {
      setError(parsed.message)
      return
    }
    change.save({ date: day, weightKg: parsed.weightKg })
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Weight"
      action={
        <Button variant="plain" type="submit" form={FORM_ID} className="-mr-2 font-semibold">
          Save
        </Button>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={submit}>
        <GroupedSection footer="A weight counts from its day until the next one you enter.">
          <InputRow
            label="Day"
            type="date"
            max={today}
            value={day}
            onChange={(event) => {
              const next = event.target.value
              // cleared or in the future: keep the day as it was
              if (next && next <= today) setDay(next)
            }}
            className="w-40 bg-transparent text-right text-[17px] text-label outline-none"
          />
          <InputRow
            label="Weight"
            suffix="kg"
            inputMode="decimal"
            placeholder="–"
            autoFocus
            value={weight}
            onChange={(event) => {
              setWeight(event.target.value)
              setError(null)
            }}
            error={error ?? undefined}
          />
        </GroupedSection>
      </form>
      {ownEntry && (
        <div className="mt-6">
          <Button
            variant="destructive"
            onClick={() => {
              change.remove(ownEntry.date)
              onClose()
            }}
          >
            Delete weight
          </Button>
        </div>
      )}
    </Sheet>
  )
}
