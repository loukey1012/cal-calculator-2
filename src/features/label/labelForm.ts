import type { BasisFormValues, IngredientFormValues } from '../ingredients/ingredientForm'
import type { LabelReading } from './labelParser'

const asText = (value: number | null) => (value === null ? '' : String(value))

/**
 * A label's values in the form: they replace the values per 100 g (or ml, as the label says);
 * per unit, the unit and everything else stay as they are.
 */
export function withLabelValues(
  values: IngredientFormValues,
  { measure, values: read }: LabelReading,
): IngredientFormValues {
  const per100g = Object.fromEntries(
    Object.entries(read).map(([field, value]) => [field, asText(value)]),
  ) as BasisFormValues
  return { ...values, measure, per100gEnabled: true, per100g }
}
