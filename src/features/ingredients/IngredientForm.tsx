import { useState, type FormEvent } from 'react'
import { InputRow, SelectRow, ToggleRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { TextField } from '../../components/ios/TextField'
import type { FieldErrors } from '../../lib/forms'
import {
  NEW_CATEGORY,
  parseIngredientForm,
  type BasisField,
  type BasisFormValues,
  type IngredientFormValues,
  type ParsedIngredientForm,
} from './ingredientForm'
import type { Category, CategoryGroup } from './ingredientsApi'

type NutrientRow = {
  readonly field: BasisField
  readonly label: string
  readonly suffix: string
  readonly indent?: boolean
}

const NUTRIENT_ROWS: readonly NutrientRow[] = [
  { field: 'kcal', label: 'Calories', suffix: 'kcal' },
  { field: 'protein', label: 'Protein', suffix: 'g' },
  { field: 'carbs', label: 'Carbs', suffix: 'g' },
  { field: 'sugar', label: 'Sugar', suffix: 'g', indent: true },
  { field: 'fat', label: 'Fat', suffix: 'g' },
  { field: 'sat_fat', label: 'Saturated fat', suffix: 'g', indent: true },
  { field: 'fiber', label: 'Fiber', suffix: 'g' },
  { field: 'salt', label: 'Salt', suffix: 'g' },
]

type BasisKey = 'per100g' | 'perUnit'

type BasisSectionProps = {
  readonly title: string
  readonly basis: BasisKey
  readonly enabled: boolean
  readonly values: BasisFormValues
  readonly errors: FieldErrors
  readonly toggleError?: string
  readonly onToggle: (enabled: boolean) => void
  readonly onChange: (field: BasisField, value: string) => void
}

function BasisSection({
  title,
  basis,
  enabled,
  values,
  errors,
  toggleError,
  onToggle,
  onChange,
}: BasisSectionProps) {
  return (
    <GroupedSection>
      <ToggleRow label={title} checked={enabled} onChange={onToggle} error={toggleError} />
      {enabled &&
        NUTRIENT_ROWS.map(({ field, label, suffix, indent }) => (
          <InputRow
            key={field}
            label={label}
            accessibleLabel={`${label} ${title.toLowerCase()}`}
            suffix={suffix}
            indent={indent}
            inputMode="decimal"
            placeholder={field === 'kcal' ? 'required' : '–'}
            value={values[field]}
            onChange={(event) => onChange(field, event.target.value)}
            error={errors[`${basis}.${field}`]}
          />
        ))}
    </GroupedSection>
  )
}

type IngredientFormProps = {
  readonly formId: string
  readonly initialValues: IngredientFormValues
  readonly categories: readonly Category[]
  readonly groups: readonly CategoryGroup[]
  readonly onSubmit: (data: ParsedIngredientForm) => void
}

export function IngredientForm({
  formId,
  initialValues,
  categories,
  groups,
  onSubmit,
}: IngredientFormProps) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<FieldErrors>({})

  const set = <K extends keyof IngredientFormValues>(key: K, value: IngredientFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const setBasisValue = (basis: BasisKey, field: BasisField, value: string) =>
    setValues((current) => ({ ...current, [basis]: { ...current[basis], [field]: value } }))

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = parseIngredientForm(values)
    setErrors(result.success ? {} : result.errors)
    if (result.success) onSubmit(result.data)
  }

  return (
    <form id={formId} noValidate onSubmit={handleSubmit}>
      <GroupedSection>
        <TextField
          label="Name"
          value={values.name}
          onChange={(event) => set('name', event.target.value)}
          error={errors.name}
        />
        <TextField
          label="Brand"
          value={values.brand}
          onChange={(event) => set('brand', event.target.value)}
          error={errors.brand}
        />
        <SelectRow
          label="Category"
          value={values.categoryId}
          onChange={(event) => set('categoryId', event.target.value)}
        >
          <option value="">None</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
          <option value={NEW_CATEGORY}>New category…</option>
        </SelectRow>
        {values.categoryId === NEW_CATEGORY && (
          <>
            <TextField
              label="New category name"
              value={values.newCategoryName}
              onChange={(event) => set('newCategoryName', event.target.value)}
              error={errors.newCategoryName}
            />
            <SelectRow
              label="Broad category"
              value={values.newCategoryGroupId}
              onChange={(event) => set('newCategoryGroupId', event.target.value)}
            >
              <option value="">None (Other)</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </SelectRow>
          </>
        )}
      </GroupedSection>

      <BasisSection
        title="Per 100 g"
        basis="per100g"
        enabled={values.per100gEnabled}
        values={values.per100g}
        errors={errors}
        toggleError={errors.per100gEnabled}
        onToggle={(enabled) => set('per100gEnabled', enabled)}
        onChange={(field, value) => setBasisValue('per100g', field, value)}
      />
      <BasisSection
        title="Per unit"
        basis="perUnit"
        enabled={values.perUnitEnabled}
        values={values.perUnit}
        errors={errors}
        onToggle={(enabled) => set('perUnitEnabled', enabled)}
        onChange={(field, value) => setBasisValue('perUnit', field, value)}
      />

      <GroupedSection header="Unit" footer="Lets you log this ingredient in grams or in units.">
        <InputRow
          label="Unit name"
          placeholder="e.g. bar"
          value={values.unitLabel}
          onChange={(event) => set('unitLabel', event.target.value)}
          error={errors.unitLabel}
        />
        <InputRow
          label="Grams per unit"
          inputMode="decimal"
          placeholder="–"
          suffix="g"
          value={values.unitWeightG}
          onChange={(event) => set('unitWeightG', event.target.value)}
          error={errors.unitWeightG}
        />
      </GroupedSection>

      <GroupedSection header="Note" footer={errors.note}>
        <textarea
          aria-label="Note"
          rows={3}
          value={values.note}
          onChange={(event) => set('note', event.target.value)}
          className="block w-full resize-none bg-transparent px-4 py-3 text-[17px] text-label outline-none"
        />
      </GroupedSection>
    </form>
  )
}
