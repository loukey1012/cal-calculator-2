import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'

export type RenderWithProvidersResult = RenderResult & { readonly queryClient: QueryClient }

type RenderOptions = {
  readonly route?: string
  /** the app keeps data fresh for a while; tests default to always-stale */
  readonly staleTime?: number
}

export function renderWithProviders(
  ui: ReactElement,
  { route = '/', staleTime = 0 }: RenderOptions = {},
): RenderWithProvidersResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime }, mutations: { retry: false } },
  })
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...result, queryClient }
}
