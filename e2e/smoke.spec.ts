import { expect, test } from '@playwright/test'

test('app shell loads with the app name', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'CALculator' })).toBeVisible()
})

test('is installable as an iOS PWA', async ({ page, request }) => {
  await page.goto('/')

  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1)
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
    'content',
    'yes',
  )
  const touchIcon = await request.get('/apple-touch-icon-180x180.png')
  expect(touchIcon.ok()).toBe(true)

  const manifest = await (await request.get('/manifest.webmanifest')).json()
  expect(manifest).toMatchObject({ name: 'CALculator', display: 'standalone' })
})
