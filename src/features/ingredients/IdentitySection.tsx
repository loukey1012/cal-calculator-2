import type { ReactNode } from 'react'
import { SelectRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { TextField } from '../../components/ios/TextField'
import type { FieldErrors } from '../../lib/forms'
import { BarcodeField } from '../barcode/BarcodeField'
import { BrandField } from './BrandField'
import { NEW_CATEGORY, type IngredientFormValues } from './ingredientForm'
import type { Category, CategoryGroup, Ingredient } from './ingredientsApi'

type IdentityKey = 'name' | 'brand' | 'barcode' | 'categoryId' | 'newCategoryName' | 'groupId'

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

/** What the ingredient is: name, brand, barcode and category (broad first, then one in it). */
export function IdentitySection({
  values,
  errors,
  categories,
  groups,
  savedIngredients,
  onChange,
  barcodeAction,
}: IdentitySectionProps) {
  const chosen = categories.find((category) => category.id === values.categoryId)
  const groupId = chosen?.group_id ?? values.groupId

  function pickGroup(id: string) {
    onChange('groupId', id)
    // the category is picked again inside the new broad category
    if (id !== groupId) onChange('categoryId', '')
  }

  function pickCategory(id: string) {
    // keeps the broad category when "New category…" replaces a saved one
    onChange('groupId', groupId)
    onChange('categoryId', id)
  }

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
        label="Broad category"
        value={groupId}
        onChange={(event) => pickGroup(event.target.value)}
        error={errors.groupId}
      >
        <option value="" disabled>
          {groups.length === 0 ? 'Add one in Settings' : 'Choose'}
        </option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </SelectRow>
      {groupId !== '' && (
        <SelectRow
          label="Category"
          value={values.categoryId}
          onChange={(event) => pickCategory(event.target.value)}
          error={errors.categoryId}
        >
          <option value="" disabled>
            Choose
          </option>
          {categories
            .filter((category) => category.group_id === groupId)
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          <option value={NEW_CATEGORY}>New category…</option>
        </SelectRow>
      )}
      {values.categoryId === NEW_CATEGORY && (
        <TextField
          label="New category name"
          value={values.newCategoryName}
          onChange={(event) => onChange('newCategoryName', event.target.value)}
          error={errors.newCategoryName}
        />
      )}
      {groupId === '' && errors.categoryId && (
        <p className="px-4 pb-2.5 text-[13px] text-destructive">{errors.categoryId}</p>
      )}
    </GroupedSection>
  )
}
