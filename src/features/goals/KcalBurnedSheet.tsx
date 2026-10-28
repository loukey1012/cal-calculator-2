import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { InputRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { Sheet } from '../../components/ios/Sheet'
import { toUserMessage } from '../../lib/errors'
import { useUpdateProfile } from '../household/hooks'
import { parseKcalBurned } from './kcalBurned'

const FORM_ID = 'kcal-burned-form'

type KcalBurnedSheetProps = {
  readonly open: boolean
  readonly userId: string
  readonly current: number | null
  readonly onClose: () => void
}

/** The person's calories burned per day: one figure for every day, not part of the goal history. */
export function KcalBurnedSheet({ open, userId, current, onClose }: KcalBurnedSheetProps) {
  const save = useUpdateProfile(userId)

  function close() {
    save.reset()
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Calories Burned"
      action={
        <Button
          variant="plain"
          type="submit"
          form={FORM_ID}
          loading={save.isPending}
          className="-mr-2 font-semibold"
        >
          Save
        </Button>
      }
    >
      <KcalBurnedForm
        initialValue={current === null ? '' : String(current)}
        onSubmit={(value) => save.mutate({ kcal_burned: value }, { onSuccess: close })}
      />
      {save.isError && <ErrorBanner message={toUserMessage(save.error)} />}
    </Sheet>
  )
}

type KcalBurnedFormProps = {
  readonly initialValue: string
  readonly onSubmit: (value: number | null) => void
}

function KcalBurnedForm({ initialValue, onSubmit }: KcalBurnedFormProps) {
  const [text, setText] = useState(initialValue)
  const [error, setError] = useState<string | undefined>()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = parseKcalBurned(text)
    setError(result.success ? undefined : result.message)
    if (result.success) onSubmit(result.value)
  }

  return (
    <form id={FORM_ID} noValidate onSubmit={handleSubmit}>
      <GroupedSection footer="Your total daily energy use, used for calories saved.">
        <InputRow
          label="Calories burned per day"
          suffix="kcal"
          inputMode="decimal"
          placeholder="–"
          value={text}
          onChange={(event) => setText(event.target.value)}
          error={error}
        />
      </GroupedSection>
    </form>
  )
}
