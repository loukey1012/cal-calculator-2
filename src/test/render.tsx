import { QueryClient, QueryClientProvider, type QueryKey } from '@tanstack/react-query'
import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'

export type RenderWithProvidersResult = RenderResult & { readonly queryClient: QueryClient }

type RenderOptions = {
  readonly route?: string
  /** navigation state of that first entry, e.g. what Open day passes to History */
  readonly state?: unknown
  /** the app keeps data fresh for a while; tests default to always-stale */
  readonly staleTime?: number
  /** data already cached, as if restored from the phone (e.g. saved by an older version) */
  readonly cached?: ReadonlyArray<readonly [QueryKey, unknown]>
}

/** A router entry for a route like "/cook?person=u2", with optional navigation state. */
function entryOf(route: string, state: unknown) {
  const [pathname = '/', query] = route.split('?')
  return { pathname, search: query ? `?${query}` : '', state }
}

export function renderWithProviders(
  ui: ReactElement,
  { route = '/', state, staleTime = 0, cached = [] }: RenderOptions = {},
): RenderWithProvidersResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime }, mutations: { retry: false } },
  })
  for (const [key, data] of cached) queryClient.setQueryData(key, data)
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entryOf(route, state)]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...result, queryClient }
}
