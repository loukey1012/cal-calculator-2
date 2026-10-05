import { useMutation, type UseMutationResult } from '@tanstack/react-query'
import { useInvalidateIngredients } from '../ingredients/hooks'
import { createCategory } from '../ingredients/ingredientsApi'
import {
  createCategoryGroup,
  deleteCategory,
  deleteCategoryGroup,
  renameCategoryGroup,
  updateCategory,
  type CategoryChange,
} from './categoriesApi'

export type SaveGroupInput = {
  /** null creates a new broad category */
  readonly id: string | null
  readonly name: string
}

export type SaveCategoryInput = CategoryChange & {
  /** null creates a new category */
  readonly id: string | null
}

// every change here can move ingredients between filters, so all three lists are refetched

export function useSaveGroup(householdId: string): UseMutationResult<void, Error, SaveGroupInput> {
  const invalidate = useInvalidateIngredients(householdId)
  return useMutation({
    mutationFn: async ({ id, name }: SaveGroupInput) => {
      if (id) await renameCategoryGroup(id, name)
      else await createCategoryGroup(householdId, name)
    },
    onSuccess: invalidate,
  })
}

export function useDeleteGroup(householdId: string): UseMutationResult<void, Error, string> {
  const invalidate = useInvalidateIngredients(householdId)
  return useMutation({ mutationFn: (id: string) => deleteCategoryGroup(id), onSuccess: invalidate })
}

export function useSaveCategory(
  householdId: string,
): UseMutationResult<void, Error, SaveCategoryInput> {
  const invalidate = useInvalidateIngredients(householdId)
  return useMutation({
    mutationFn: async ({ id, name, groupId }: SaveCategoryInput) => {
      if (id) await updateCategory(id, { name, groupId })
      else await createCategory(householdId, name, groupId)
    },
    onSuccess: invalidate,
  })
}

export function useDeleteCategory(householdId: string): UseMutationResult<void, Error, string> {
  const invalidate = useInvalidateIngredients(householdId)
  return useMutation({ mutationFn: (id: string) => deleteCategory(id), onSuccess: invalidate })
}
