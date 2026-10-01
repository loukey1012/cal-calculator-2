import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// Runs against the remote DEV Supabase project (never prod). Credentials: .env.test.local
export default defineConfig(({ mode }) => ({
  test: {
    environment: 'node',
    include: ['supabase/tests/**/*.test.ts'],
    env: loadEnv(mode, process.cwd(), ''),
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
}))
