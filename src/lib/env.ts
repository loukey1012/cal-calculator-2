import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
})

export type AppEnv = {
  readonly supabaseUrl: string
  readonly supabaseAnonKey: string
}

export function parseEnv(raw: Record<string, unknown>): AppEnv {
  const result = envSchema.safeParse(raw)
  if (!result.success) {
    const invalidKeys = result.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`Invalid or missing environment variables: ${invalidKeys}`)
  }
  return {
    supabaseUrl: result.data.VITE_SUPABASE_URL,
    supabaseAnonKey: result.data.VITE_SUPABASE_ANON_KEY,
  }
}
