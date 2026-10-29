import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  ingredientDraftKey,
  loadIngredientDraft,
  saveIngredientDraft,
} from '../ingredients/ingredientDraft'
import { EMPTY_INGREDIENT_FORM } from '../ingredients/ingredientForm'
import { useMergeByHand, useMergeIngredients } from './hooks'
import { mergeIngredients } from './reviewApi'
import { finding } from './testData'

vi.mock('./reviewApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./reviewApi')>()),
  mergeIngredients: vi.fn(),
}))

const ROOTS = [['day'], ['month'], ['dish'], ['leftovers']]

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { wrapper, invalidate }
}

const input = { keepId: 'k1', dropId: 'd1', patch: {} }

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  vi.mocked(mergeIngredients).mockResolvedValue()
})

type Merger = { readonly isSuccess: boolean }

/** Runs one merge to its end and says which queries it refreshed. */
async function merge<T extends Merger>(useHook: () => T, run: (hook: T) => void) {
  const { wrapper, invalidate } = setup()
  const { result } = renderHook(useHook, { wrapper })
  run(result.current)
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  return invalidate.mock.calls.map(([filter]) => filter?.queryKey)
}

function saveBothDrafts() {
  saveIngredientDraft(ingredientDraftKey('h1', 'k1'), EMPTY_INGREDIENT_FORM)
  saveIngredientDraft(ingredientDraftKey('h1', 'd1'), EMPTY_INGREDIENT_FORM)
}

function expectBothDraftsCleared() {
  expect(loadIngredientDraft(ingredientDraftKey('h1', 'k1'))).toBeNull()
  expect(loadIngredientDraft(ingredientDraftKey('h1', 'd1'))).toBeNull()
}

describe('merging by hand', () => {
  test('refreshes the days, months, dishes and leftovers that held the dropped ingredient', async () => {
    const keys = await merge(
      () => useMergeByHand('h1'),
      (hook) => hook.mutate(input),
    )

    expect(keys).toEqual(expect.arrayContaining(ROOTS))
  })

  test('clears the typed drafts of both ingredients once merged', async () => {
    saveBothDrafts()

    await merge(
      () => useMergeByHand('h1'),
      (hook) => hook.mutate(input),
    )

    expectBothDraftsCleared()
  })
})

describe('merging from a finding', () => {
  test('refreshes the days, months, dishes and leftovers that held the dropped ingredient', async () => {
    const keys = await merge(
      () => useMergeIngredients('h1'),
      (hook) => hook.mutate({ ...input, finding: finding({}) }),
    )

    expect(keys).toEqual(expect.arrayContaining(ROOTS))
  })

  test('clears the typed drafts of both ingredients once merged', async () => {
    saveBothDrafts()

    await merge(
      () => useMergeIngredients('h1'),
      (hook) => hook.mutate({ ...input, finding: finding({}) }),
    )

    expectBothDraftsCleared()
  })
})
