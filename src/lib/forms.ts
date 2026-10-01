import type { z } from 'zod'

export type FieldErrors = Readonly<Record<string, string>>

/** First validation message per field, keyed by path, e.g. `{ email: '…', 'per100g.kcal': '…' }`. */
export function fieldErrors(error: z.ZodError | undefined): FieldErrors {
  if (!error) return {}
  return error.issues.reduce<Record<string, string>>((errors, issue) => {
    const field = issue.path.map(String).join('.')
    if (field === '' || field in errors) return errors
    return { ...errors, [field]: issue.message }
  }, {})
}
