import { vi, type Mock } from 'vitest'

export type QueryResult = { readonly data: unknown; readonly error: unknown }

export type FakeQuery = {
  readonly select: Mock
  readonly eq: Mock
  readonly order: Mock
  readonly single: Mock
  readonly then: PromiseLike<QueryResult>['then']
}

/** A chainable stand-in for a supabase-js query builder that resolves to `result`. */
export function fakeQuery(result: QueryResult): FakeQuery {
  const promise = Promise.resolve(result)
  const query: FakeQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    single: vi.fn(() => promise),
    then: promise.then.bind(promise),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.order.mockReturnValue(query)
  return query
}
