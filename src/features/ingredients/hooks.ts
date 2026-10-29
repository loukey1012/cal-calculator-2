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
  fetchIngredientUses,
  fetchIngredients,
  setIngredientBarcode,
  updateIngredient,
  type Category,
  type CategoryGroup,
  type Ingredient,
} from './ingredientsApi'
import { reviewKeys } from '../review/keys'

/**
 * Version of the ingredient rows kept on the phone. Bump it when the rows get a new column, so a
 * copy from before is ignored instead of handing new code rows without it (vegan and halal came
 * with version 2). It is part of the key, so saving, refreshing and live hints follow along.
 */
const INGREDIENTS_SHAPE = 'v2'

export const ingredientKeys = {
  ingredients: (householdId: string) => ['ingredients', INGREDIENTS_SHAPE, householdId] as const,
  categories: (householdId: string) => ['categories', householdId] as const,
  categoryGroups: (householdId: string) => ['categoryGroups', householdId] as const,
  uses: (householdId: string) => ['ingredientUses', householdId] as const,
}

type IngredientsQueryOptions = {
  /** refresh whenever the caller mounts, while still showing the cached list right away */
  readonly alwaysRefresh?: boolean
}

const NO_INGREDIENTS: ReadonlyMap<string, Ingredient> = new Map()

// one function for every observer, so React Query reuses the selected map until the data changes
const toIngredientMap = (list: Ingredient[]): ReadonlyMap<string, Ingredient> =>
  new Map(list.map((item) => [item.id, item]))

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

/** The household's ingredients by id; the map is built once per fetch, not per caller. */
export function useIngredientsById(householdId: string): ReadonlyMap<string, Ingredient> {
  const { data } = useQuery({
    queryKey: ingredientKeys.ingredients(householdId),
    queryFn: () => fetchIngredients(householdId),
    select: toIngredientMap,
  })
  return data ?? NO_INGREDIENTS
}

/** How often each ingredient was used; only loaded when `enabled` (sorting by most used). */
export function useIngredientUses(
  householdId: string,
  enabled: boolean,
): UseQueryResult<Record<string, number>> {
  return useQuery({
    queryKey: ingredientKeys.uses(householdId),
    queryFn: () => fetchIngredientUses(),
    enabled,
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
): Promise<string> {
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

type SaveIngredientInput = {
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

/** Ingredients plus the review findings, which are derived from them. */
function useInvalidateIngredientsAndFindings(householdId: string): () => Promise<unknown> {
  const invalidateIngredients = useInvalidateIngredients(householdId)
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      invalidateIngredients(),
      queryClient.invalidateQueries({ queryKey: reviewKeys.findings(householdId) }),
    ])
}

function useCacheSaved(householdId: string): (saved: Ingredient) => void {
  const queryClient = useQueryClient()
  return (saved) =>
    queryClient.setQueryData<Ingredient[]>(ingredientKeys.ingredients(householdId), (list) =>
      list ? [...list.filter((ingredient) => ingredient.id !== saved.id), saved] : list,
    )
}

export function useSaveIngredient(
  householdId: string,
): UseMutationResult<Ingredient, Error, SaveIngredientInput> {
  const invalidate = useInvalidateIngredientsAndFindings(householdId)
  const cacheSaved = useCacheSaved(householdId)
  return useMutation({
    mutationFn: async ({ id, form, categories }: SaveIngredientInput) => {
      const categoryId = await resolveCategoryId(householdId, form.category, categories)
      const input = { ...form.ingredient, category_id: categoryId }
      return id ? updateIngredient(id, input) : createIngredient(householdId, input)
    },
    // in the list at once, e.g. for the amount step right after creating it in Add food
    onSuccess: cacheSaved,
    // also after a failure: a category may have been created before the ingredient failed
    onSettled: invalidate,
  })
}

type LinkBarcodeInput = { readonly id: string; readonly barcode: string }

/** Saves a scanned barcode on an existing ingredient, so scanning finds it from then on. */
export function useLinkBarcode(
  householdId: string,
): UseMutationResult<Ingredient, Error, LinkBarcodeInput> {
  const invalidate = useInvalidateIngredientsAndFindings(householdId)
  const cacheSaved = useCacheSaved(householdId)
  return useMutation({
    mutationFn: ({ id, barcode }: LinkBarcodeInput) => setIngredientBarcode(id, barcode),
    onSuccess: cacheSaved,
    onSettled: invalidate,
  })
}

export function useDeleteIngredient(householdId: string): UseMutationResult<void, Error, string> {
  const invalidate = useInvalidateIngredientsAndFindings(householdId)
  return useMutation({
    mutationFn: (id: string) => deleteIngredient(id),
    onSuccess: invalidate,
  })
}
