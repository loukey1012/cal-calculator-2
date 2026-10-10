import type { ReactNode } from 'react'
import { InputRow, ToggleRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import type { FieldErrors } from '../../lib/forms'
import type { BasisField, BasisFormValues, BasisKey } from './ingredientForm'

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
