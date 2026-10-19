import { ApiError } from './errors'

// the API returns at most this many rows per request (supabase/config.toml max_rows)
export const PAGE_SIZE = 1000

type Page<T> = PromiseLike<{
  data: T[] | null
  error: Parameters<typeof ApiError.from>[0] | null
}>

/** Every row of a query, page by page, so a long range is never cut off at the row limit. */
export async function allRows<T>(
  page: (from: number, to: number) => Page<T>,
  start = 0,
): Promise<T[]> {
  const { data, error } = await page(start, start + PAGE_SIZE - 1)
  if (error) throw ApiError.from(error)
  const rows = data ?? []
  if (rows.length < PAGE_SIZE) return rows
  return [...rows, ...(await allRows(page, start + PAGE_SIZE))]
}
