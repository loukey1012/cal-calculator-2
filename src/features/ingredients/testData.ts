import type { Category, CategoryGroup, Ingredient } from './ingredientsApi'

const EMPTY_INGREDIENT: Ingredient = {
  id: 'i0',
  household_id: 'h1',
  category_id: null,
  name: '',
  brand: null,
  note: null,
  kcal_100: null,
  protein_100: null,
  carbs_100: null,
  sugar_100: null,
  fat_100: null,
  sat_fat_100: null,
  fiber_100: null,
  salt_100: null,
  unit_label: null,
  unit_weight_g: null,
  kcal_unit: null,
  protein_unit: null,
  carbs_unit: null,
  sugar_unit: null,
  fat_unit: null,
  sat_fat_unit: null,
  fiber_unit: null,
  salt_unit: null,
  legacy_id: null,
  barcode: null,
  created_by: null,
  created_at: '',
  updated_at: '',
}

export function ingredient(overrides: Partial<Ingredient>): Ingredient {
  return { ...EMPTY_INGREDIENT, ...overrides }
}

export function category(id: string, name: string, groupId: string | null = null): Category {
  return { id, name, group_id: groupId, household_id: 'h1', created_at: '' }
}

export function categoryGroup(id: string, name: string): CategoryGroup {
  return { id, name, household_id: 'h1', created_at: '' }
}
