import type { ReactNode } from 'react'
import { SelectRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { TextField } from '../../components/ios/TextField'
import type { FieldErrors } from '../../lib/forms'
import { BarcodeField } from '../barcode/BarcodeField'
import { BrandField } from './BrandField'
import { NEW_CATEGORY, type IngredientFormValues } from './ingredientForm'
import type { Category, CategoryGroup, Ingredient } from './ingredientsApi'

type IdentityKey =
  'name' | 'brand' | 'barcode' | 'categoryId' | 'newCategoryName' | 'newCategoryGroupId'

type IdentitySectionProps = {
  readonly values: IngredientFormValues
  readonly errors: FieldErrors
  readonly categories: readonly Category[]
  readonly groups: readonly CategoryGroup[]
  readonly savedIngredients: readonly Ingredient[]
  readonly onChange: (key: IdentityKey, value: string) => void
  /** below the barcode, e.g. looking it up */
  readonly barcodeAction?: ReactNode
}

/** What the ingredient is: name, brand, barcode and category. */
export function IdentitySection({
  values,
  errors,
  categories,
  groups,
  savedIngredients,
  onChange,
  barcodeAction,
}: IdentitySectionProps) {
  return (
    <GroupedSection>
      <TextField
        label="Name"
        value={values.name}
        onChange={(event) => onChange('name', event.target.value)}
        error={errors.name}
      />
      <BrandField
        value={values.brand}
        onChange={(brand) => onChange('brand', brand)}
        error={errors.brand}
        savedIngredients={savedIngredients}
      />
      <BarcodeField
        value={values.barcode}
        error={errors.barcode}
        onChange={(barcode) => onChange('barcode', barcode)}
      />
      {barcodeAction}
      <SelectRow
        label="Category"
        value={values.categoryId}
        onChange={(event) => onChange('categoryId', event.target.value)}
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
            onChange={(event) => onChange('newCategoryName', event.target.value)}
            error={errors.newCategoryName}
          />
          <SelectRow
            label="Broad category"
            value={values.newCategoryGroupId}
            onChange={(event) => onChange('newCategoryGroupId', event.target.value)}
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
  )
}
