import type { ReactNode } from 'react'
import { InputRow, ToggleRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import type { FieldErrors } from '../../lib/forms'
import type { BasisField, BasisFormValues, BasisKey } from './ingredientForm'

type NutrientRow = {
  readonly field: BasisField
  /** what the row reads, e.g. "of which sugars" */
  readonly label: string
  /** the nutrient's own name, for screen readers and the clear button */
  readonly name: string
  readonly suffix: string
  /** an "of which" line under its parent */
  readonly indent?: boolean
}

/** In the order of a nutrition label. */
const NUTRIENT_ROWS: readonly NutrientRow[] = [
  { field: 'kcal', label: 'Calories', name: 'Calories', suffix: 'kcal' },
  { field: 'fat', label: 'Fat', name: 'Fat', suffix: 'g' },
  {
    field: 'sat_fat',
    label: 'of which saturates',
    name: 'Saturated fat',
    suffix: 'g',
    indent: true,
  },
  { field: 'carbs', label: 'Carbs', name: 'Carbs', suffix: 'g' },
  { field: 'sugar', label: 'of which sugars', name: 'Sugar', suffix: 'g', indent: true },
  { field: 'fiber', label: 'Fiber', name: 'Fiber', suffix: 'g' },
  { field: 'protein', label: 'Protein', name: 'Protein', suffix: 'g' },
  { field: 'salt', label: 'Salt', name: 'Salt', suffix: 'g' },
]

type BasisSectionProps = {
  readonly title: string
  readonly basis: BasisKey
  readonly enabled: boolean
  readonly values: BasisFormValues
  readonly errors: FieldErrors
  /** fields whose values look wrong, keyed like the errors */
  readonly flagged: ReadonlySet<string>
  readonly toggleError?: string
  readonly onToggle: (enabled: boolean) => void
  readonly onChange: (field: BasisField, value: string) => void
  readonly onClearField: (field: BasisField) => void
  readonly onClearAll: () => void
  /** shown in place of "Clear values" right after clearing */
  readonly undo?: ReactNode
  /** more rows at the end, e.g. splitting a portion */
  readonly children?: ReactNode
}

/** The values per 100 g or per unit: a switch, a row per nutrient, and clearing them. */
export function BasisSection({
  title,
  basis,
  enabled,
  values,
  errors,
  flagged,
  toggleError,
  onToggle,
  onChange,
  onClearField,
  onClearAll,
  undo,
  children,
}: BasisSectionProps) {
  const hasValues = Object.values(values).some((value) => value.trim() !== '')
  return (
    <GroupedSection>
      <ToggleRow label={title} checked={enabled} onChange={onToggle} error={toggleError} />
      {enabled &&
        NUTRIENT_ROWS.map(({ field, label, name, suffix, indent }) => (
          <InputRow
            key={field}
            label={label}
            accessibleLabel={`${name} ${title.toLowerCase()}`}
            suffix={suffix}
            indent={indent}
            inputMode="decimal"
            placeholder={field === 'kcal' ? 'required' : '–'}
            value={values[field]}
            onChange={(event) => onChange(field, event.target.value)}
            onClear={() => onClearField(field)}
            flagged={flagged.has(`${basis}.${field}`)}
            error={errors[`${basis}.${field}`]}
          />
        ))}
      {enabled && children}
      {enabled &&
        (undo ??
          (hasValues && (
            <button
              type="button"
              onClick={onClearAll}
              className="block w-full px-4 py-3 text-left text-[17px] text-destructive active:opacity-60"
            >
              Clear values {title.toLowerCase()}
            </button>
          )))}
    </GroupedSection>
  )
}
