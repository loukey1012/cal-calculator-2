import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { ingredientKeys, useIngredients } from './hooks'
import { fetchIngredients } from './ingredientsApi'
import { ingredient } from './testData'

vi.mock('./ingredientsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./ingredientsApi')>()),
  fetchIngredients: vi.fn(),
}))

// a copy kept on the phone before vegan and halal existed: rows without the two fields
const OLD_COPY = [{ id: 'i1', name: 'Oats' }]

describe('the household ingredients query', () => {
  test('an old copy without the diet fields is never handed to the app', async () => {
    const fresh = [ingredient({ id: 'i1', name: 'Oats', vegan: true })]
    vi.mocked(fetchIngredients).mockResolvedValue(fresh)
    const client = new QueryClient()
    client.setQueryData(['ingredients', 'h1'], OLD_COPY)
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useIngredients('h1'), { wrapper })

    expect(result.current.data).toBeUndefined()
    await waitFor(() => expect(result.current.data).toEqual(fresh))
  })

  test('the key carries a shape version and still tells households apart', () => {
    expect(ingredientKeys.ingredients('h1')).not.toEqual(ingredientKeys.ingredients('h2'))
  })
})
