import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import type { Recipe } from './recipeModel'
import { deleteRecipe, fetchRecipes, saveRecipe } from './recipesApi'

// The cached recipes are kept on the phone; a new shape gets a new version here, so a list kept
// by an older app version is ignored (and loaded again) instead of misread. v2: lines with
// choices (`slots`) instead of `lines`.
const RECIPES_SHAPE = 'v2'

export const recipeKeys = {
  recipes: (householdId: string) => ['recipes', RECIPES_SHAPE, householdId] as const,
}

export function useRecipes(householdId: string): UseQueryResult<Recipe[]> {
  return useQuery({ queryKey: recipeKeys.recipes(householdId), queryFn: fetchRecipes })
}

type ListContext = { readonly previous?: Recipe[] }

const byName = (a: Recipe, b: Recipe) => a.name.localeCompare(b.name)

/** Shows the change in the list at once; the list comes back as it was if saving fails. */
function useListedLocally<TInput>(
  householdId: string,
  change: (list: readonly Recipe[], input: TInput) => Recipe[],
) {
  const queryClient = useQueryClient()
  const key = recipeKeys.recipes(householdId)
  return {
    onMutate: async (input: TInput): Promise<ListContext> => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Recipe[]>(key)
      if (previous) queryClient.setQueryData(key, change(previous, input))
      return { previous }
    },
    onError: (_error: Error, _input: TInput, context?: ListContext) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  }
}

/** Creates a recipe or replaces the one with its id. */
export function useSaveRecipe(
  householdId: string,
): UseMutationResult<void, Error, Recipe, ListContext> {
  return useMutation({
    mutationFn: saveRecipe,
    ...useListedLocally<Recipe>(householdId, (list, saved) =>
      [...list.filter((recipe) => recipe.id !== saved.id), saved].toSorted(byName),
    ),
  })
}

export function useDeleteRecipe(
  householdId: string,
): UseMutationResult<void, Error, string, ListContext> {
  return useMutation({
    mutationFn: deleteRecipe,
    ...useListedLocally<string>(householdId, (list, recipeId) =>
      list.filter((recipe) => recipe.id !== recipeId),
    ),
  })
}
