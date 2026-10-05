import { vi, type Mock } from 'vitest'

export type QueryResult = { readonly data: unknown; readonly error: unknown }

export type FakeQuery = {
  readonly select: Mock
  readonly insert: Mock
  readonly upsert: Mock
  readonly update: Mock
  readonly delete: Mock
  readonly eq: Mock
  readonly is: Mock
  readonly in: Mock
  readonly gte: Mock
  readonly order: Mock
  readonly single: Mock
  readonly maybeSingle: Mock
  readonly then: PromiseLike<QueryResult>['then']
}

/** A chainable stand-in for a supabase-js query builder that resolves to `result`. */
export function fakeQuery(result: QueryResult): FakeQuery {
  const promise = Promise.resolve(result)
  const query: FakeQuery = {
    select: vi.fn(),
    insert: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    in: vi.fn(),
    gte: vi.fn(),
    order: vi.fn(),
    single: vi.fn(() => promise),
    maybeSingle: vi.fn(() => promise),
    then: promise.then.bind(promise),
  }
  for (const method of [query.select, query.insert, query.upsert, query.update, query.delete]) {
    method.mockReturnValue(query)
  }
  for (const filter of [query.eq, query.is, query.in, query.gte]) filter.mockReturnValue(query)
  query.order.mockReturnValue(query)
  return query
}
