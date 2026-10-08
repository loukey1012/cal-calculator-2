import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  // a fixed version for the tests (the real one is set by vite.config.ts at build time)
  define: {
    __APP_VERSION__: JSON.stringify({ id: 'test123abc', builtAt: '2026-10-08T06:40:00.000Z' }),
  },
  test: {
    environment: 'jsdom',
    // the raw stylesheet, so tests can check its color tokens against the code
    css: { include: [/index\.css/] },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/main.tsx',
        'src/lib/database.types.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})
