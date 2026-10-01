import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import { ApiError } from '../../lib/errors'
import type { CategoryChoice, ParsedIngredientForm } from './ingredientForm'
import {
  createCategory,
  createIngredient,
  deleteIngredient,
  fetchCategories,
  fetchIngredients,
  updateIngredient,
  type Category,
  type Ingredient,
} from './ingredientsApi'

export const ingredientKeys = {
  ingredients: (householdId: string) => ['ingredients', householdId] as const,
  categories: (householdId: string) => ['categories', householdId] as const,
}

export function useIngredients(householdId: string): UseQueryResult<Ingredient[]> {
  return useQuery({
    queryKey: ingredientKeys.ingredients(householdId),
    queryFn: () => fetchIngredients(householdId),
  })
}

export function useCategories(householdId: string): UseQueryResult<Category[]> {
  return useQuery({
    queryKey: ingredientKeys.categories(householdId),
    queryFn: () => fetchCategories(householdId),
  })
}

const UNIQUE_VIOLATION = '23505'

function findByName(categories: readonly Category[], name: string): Category | undefined {
  return categories.find((category) => category.name.toLowerCase() === name.toLowerCase())
}

/**
 * A "new" category whose name already exists (any case) reuses the existing one. The list the
 * form saw can be stale (a partner added it, or an earlier save created it and then failed), so
 * a unique violation falls back to the current list from the database.
 */
async function resolveCategoryId(
  householdId: string,
  choice: CategoryChoice,
  categories: readonly Category[],
): Promise<string | null> {
  if (choice.kind === 'none') return null
  if (choice.kind === 'existing') return choice.id
  const known = findByName(categories, choice.name)
  if (known) return known.id
  try {
    return (await createCategory(householdId, choice.name)).id
  } catch (error) {
    if (!(error instanceof ApiError && error.code === UNIQUE_VIOLATION)) throw error
    const existing = findByName(await fetchCategories(householdId), choice.name)
    if (!existing) throw error
    return existing.id
  }
}

export type SaveIngredientInput = {
  /** null creates a new ingredient */
  readonly id: string | null
  readonly form: ParsedIngredientForm
  readonly categories: readonly Category[]
}

function useInvalidateIngredients(householdId: string) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ingredientKeys.ingredients(householdId) }),
      queryClient.invalidateQueries({ queryKey: ingredientKeys.categories(householdId) }),
    ])
}

export function useSaveIngredient(
  householdId: string,
): UseMutationResult<Ingredient, Error, SaveIngredientInput> {
  const invalidate = useInvalidateIngredients(householdId)
  return useMutation({
    mutationFn: async ({ id, form, categories }: SaveIngredientInput) => {
      const categoryId = await resolveCategoryId(householdId, form.category, categories)
      const input = { ...form.ingredient, category_id: categoryId }
      return id ? updateIngredient(id, input) : createIngredient(householdId, input)
    },
    // also after a failure: a category may have been created before the ingredient failed
    onSettled: invalidate,
  })
}

export function useDeleteIngredient(householdId: string): UseMutationResult<void, Error, string> {
  const invalidate = useInvalidateIngredients(householdId)
  return useMutation({
    mutationFn: (id: string) => deleteIngredient(id),
    onSuccess: invalidate,
  })
}
