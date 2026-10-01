import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ios/Button'
import { InputRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { TextField } from '../../components/ios/TextField'
import type { FieldErrors } from '../../lib/forms'
import type { NutritionBasis } from '../nutrition/types'
import {
  EMPTY_CUSTOM_ITEM,
  parseCustomItem,
  type CustomItemValues,
  type ParsedCustomItem,
} from './customItem'

const BASIS_OPTIONS = [
  { value: 'per_100g', label: 'Per 100 g' },
  { value: 'per_unit', label: 'Per unit' },
] as const satisfies ReadonlyArray<{ value: NutritionBasis; label: string }>

type NumberField = 'kcal' | 'protein' | 'carbs' | 'fat'
const NUMBER_ROWS: ReadonlyArray<{ field: NumberField; label: string; suffix: string }> = [
  { field: 'kcal', label: 'Calories', suffix: 'kcal' },
  { field: 'protein', label: 'Protein', suffix: 'g' },
  { field: 'carbs', label: 'Carbs', suffix: 'g' },
  { field: 'fat', label: 'Fat', suffix: 'g' },
]

type CustomItemFormProps = {
  readonly confirmLabel: string
  readonly onConfirm: (item: ParsedCustomItem) => void
}

/** A one-off item for this meal only; nothing is saved to the ingredient database. */
export function CustomItemForm({ confirmLabel, onConfirm }: CustomItemFormProps) {
  const [values, setValues] = useState<CustomItemValues>(EMPTY_CUSTOM_ITEM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const set = <K extends keyof CustomItemValues>(key: K, value: CustomItemValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = parseCustomItem(values)
    setErrors(result.success ? {} : result.errors)
    if (result.success) onConfirm(result.data)
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <GroupedSection>
        <TextField
          label="Name"
          value={values.name}
          onChange={(event) => set('name', event.target.value)}
          error={errors.name}
        />
      </GroupedSection>
      <div className="mt-6">
        <SegmentedControl
          label="Values"
          options={BASIS_OPTIONS}
          value={values.basis}
          onChange={(basis) => set('basis', basis)}
        />
      </div>
      <GroupedSection footer="Only calories are required.">
        {NUMBER_ROWS.map(({ field, label, suffix }) => (
          <InputRow
            key={field}
            label={label}
            suffix={suffix}
            inputMode="decimal"
            placeholder={field === 'kcal' ? 'required' : '–'}
            value={values[field]}
            onChange={(event) => set(field, event.target.value)}
            error={errors[field]}
          />
        ))}
      </GroupedSection>
      <GroupedSection>
        <InputRow
          label="Amount"
          suffix={values.basis === 'per_unit' ? 'units' : 'g'}
          inputMode="decimal"
          placeholder="0"
          value={values.amount}
          onChange={(event) => set('amount', event.target.value)}
          error={errors.amount}
        />
      </GroupedSection>
      <div className="mt-6">
        <Button type="submit">{confirmLabel}</Button>
      </div>
    </form>
  )
}
