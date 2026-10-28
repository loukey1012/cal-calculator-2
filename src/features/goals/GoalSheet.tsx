import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { InputRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { Sheet } from '../../components/ios/Sheet'
import { toUserMessage } from '../../lib/errors'
import type { FieldErrors } from '../../lib/forms'
import type { Goal } from '../nutrition/goals'
import { parseGoalForm, toGoalFormValues, type GoalFormValues, type GoalInput } from './goalForm'
import { useSaveGoal } from './hooks'

const FORM_ID = 'goal-form'

const ROWS: ReadonlyArray<{ field: keyof GoalFormValues; label: string; suffix: string }> = [
  { field: 'kcal', label: 'Calories', suffix: 'kcal' },
  { field: 'protein', label: 'Protein', suffix: 'g' },
  { field: 'carbs', label: 'Carbs', suffix: 'g' },
  { field: 'fat', label: 'Fat', suffix: 'g' },
  { field: 'fiber', label: 'Fiber', suffix: 'g' },
]

type GoalSheetProps = {
  readonly open: boolean
  readonly userId: string
  /** local YYYY-MM-DD the new goal applies from (the day the sheet was opened for) */
  readonly date: string
  /** the goal valid on that day, used to pre-fill the form */
  readonly current: Goal | null
  readonly onClose: () => void
}

export function GoalSheet({ open, userId, date, current, onClose }: GoalSheetProps) {
  const save = useSaveGoal(userId)

  function close() {
    save.reset()
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Daily Goal"
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
      <GoalForm
        initialValues={toGoalFormValues(current)}
        onSubmit={(goal) => save.mutate({ validFrom: date, goal }, { onSuccess: close })}
      />
      {save.isError && <ErrorBanner message={toUserMessage(save.error)} />}
    </Sheet>
  )
}

type GoalFormProps = {
  readonly initialValues: GoalFormValues
  readonly onSubmit: (goal: GoalInput) => void
}

function GoalForm({ initialValues, onSubmit }: GoalFormProps) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<FieldErrors>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = parseGoalForm(values)
    setErrors(result.success ? {} : result.errors)
    if (result.success) onSubmit(result.data)
  }

  return (
    <form id={FORM_ID} noValidate onSubmit={handleSubmit}>
      <GroupedSection footer="Only calories are required. Applies from today on; past days keep the goal they had.">
        {ROWS.map(({ field, label, suffix }) => (
          <InputRow
            key={field}
            label={label}
            suffix={suffix}
            inputMode="decimal"
            placeholder={field === 'kcal' ? 'required' : '–'}
            value={values[field]}
            onChange={(event) =>
              setValues((current) => ({ ...current, [field]: event.target.value }))
            }
            error={errors[field]}
          />
        ))}
      </GroupedSection>
      <GroupedSection
        header="Weight"
        footer="The weight you want to reach, shown on the weight chart in History › Trends."
      >
        <InputRow
          label="Target weight"
          suffix="kg"
          inputMode="decimal"
          placeholder="–"
          value={values.weight}
          onChange={(event) => setValues((current) => ({ ...current, weight: event.target.value }))}
          error={errors.weight}
        />
      </GroupedSection>
    </form>
  )
}
