import type { z } from 'zod'

export type FieldErrors = Readonly<Record<string, string>>

/** First validation message per top-level field, e.g. `{ email: 'Enter a valid email address' }`. */
export function fieldErrors(error: z.ZodError | undefined): FieldErrors {
  if (!error) return {}
  return error.issues.reduce<Record<string, string>>((errors, issue) => {
    const field = issue.path[0]
    if (field === undefined || String(field) in errors) return errors
    return { ...errors, [String(field)]: issue.message }
  }, {})
}
