import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'

export type RenderWithProvidersResult = RenderResult & { readonly queryClient: QueryClient }

type RenderOptions = { readonly route?: string }

export function renderWithProviders(
  ui: ReactElement,
  { route = '/' }: RenderOptions = {},
): RenderWithProvidersResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...result, queryClient }
}
