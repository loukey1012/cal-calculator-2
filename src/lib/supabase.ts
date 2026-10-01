import { createClient } from '@supabase/supabase-js'
import { parseEnv } from './env'

const env = parseEnv(import.meta.env)

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})
