import { ApiError, toUserMessage } from '../../lib/errors'

// mirrors the database check on categories.name and category_groups.name
const MAX_NAME = 40
const UNIQUE_VIOLATION = '23505'

export type NameResult =
  | { readonly success: true; readonly name: string }
  | { readonly success: false; readonly error: string }

export function parseCategoryName(raw: string): NameResult {
  const name = raw.trim()
  if (name === '') return { success: false, error: 'Enter a name' }
  if (name.length > MAX_NAME) return { success: false, error: `Use at most ${MAX_NAME} characters` }
  return { success: true, name }
}

/** Names are unique per household (any case): say so instead of the generic "already exists". */
export function categoryErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === UNIQUE_VIOLATION)
    return 'That name is already taken.'
  return toUserMessage(error)
}
