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
  fetchCategoryGroups,
  fetchIngredients,
  updateIngredient,
  type Category,
  type CategoryGroup,
  type Ingredient,
} from './ingredientsApi'

export const ingredientKeys = {
  ingredients: (householdId: string) => ['ingredients', householdId] as const,
  categories: (householdId: string) => ['categories', householdId] as const,
  categoryGroups: (householdId: string) => ['categoryGroups', householdId] as const,
}

type IngredientsQueryOptions = {
  /** refresh whenever the caller mounts, while still showing the cached list right away */
  readonly alwaysRefresh?: boolean
}

export function useIngredients(
  householdId: string,
  { alwaysRefresh = false }: IngredientsQueryOptions = {},
): UseQueryResult<Ingredient[]> {
  return useQuery({
    queryKey: ingredientKeys.ingredients(householdId),
    queryFn: () => fetchIngredients(householdId),
    refetchOnMount: alwaysRefresh ? 'always' : true,
  })
}

export function useCategories(householdId: string): UseQueryResult<Category[]> {
  return useQuery({
    queryKey: ingredientKeys.categories(householdId),
    queryFn: () => fetchCategories(householdId),
  })
}

export function useCategoryGroups(householdId: string): UseQueryResult<CategoryGroup[]> {
  return useQuery({
    queryKey: ingredientKeys.categoryGroups(householdId),
    queryFn: () => fetchCategoryGroups(householdId),
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
    return (await createCategory(householdId, choice.name, choice.groupId)).id
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

/** Refetches ingredients, categories and broad categories, e.g. after one of them changed. */
export function useInvalidateIngredients(householdId: string): () => Promise<unknown> {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ingredientKeys.ingredients(householdId) }),
      queryClient.invalidateQueries({ queryKey: ingredientKeys.categories(householdId) }),
      queryClient.invalidateQueries({ queryKey: ingredientKeys.categoryGroups(householdId) }),
    ])
}

export function useSaveIngredient(
  householdId: string,
): UseMutationResult<Ingredient, Error, SaveIngredientInput> {
  const invalidate = useInvalidateIngredients(householdId)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, form, categories }: SaveIngredientInput) => {
      const categoryId = await resolveCategoryId(householdId, form.category, categories)
      const input = { ...form.ingredient, category_id: categoryId }
      return id ? updateIngredient(id, input) : createIngredient(householdId, input)
    },
    // in the list at once, e.g. for the amount step right after creating it on Cook
    onSuccess: (saved) =>
      queryClient.setQueryData<Ingredient[]>(ingredientKeys.ingredients(householdId), (list) =>
        list ? [...list.filter((ingredient) => ingredient.id !== saved.id), saved] : list,
      ),
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
