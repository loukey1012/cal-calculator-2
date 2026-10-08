import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
// machines without WebKit's system libraries can run the iPhone journeys in Chromium
const journeyBrowser =
  process.env.E2E_BROWSER === 'chromium' ? { browserName: 'chromium' as const } : {}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // the journeys mostly wait on the network (each creates its own users): 4 at a time in CI
  workers: process.env.CI ? 4 : undefined,
  reporter: 'list',
  timeout: 90_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    // no backend needed: runs on every push and pull request
    { name: 'smoke', testMatch: /smoke\.spec\.ts/, use: { ...devices['iPhone 15'] } },
    // real journeys against the dev Supabase project (skipped without its credentials)
    {
      name: 'journeys-webkit',
      testMatch: /journeys\/.*\.spec\.ts/,
      use: { ...devices['iPhone 15'], ...journeyBrowser },
    },
    {
      // Playwright's WebKit has no service workers: the offline-restart part runs here
      name: 'journeys-chromium',
      testMatch: /journeys\/offline\.spec\.ts/,
      use: { ...devices['iPhone 15'], browserName: 'chromium' },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
