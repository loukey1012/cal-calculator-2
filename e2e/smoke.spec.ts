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

test('starts with the cached app icon before the app has loaded', async ({ page, request }) => {
  await page.addInitScript(() => {
    localStorage.setItem('calculator-appearance', JSON.stringify({ appIcon: 'sunset' }))
  })

  await page.goto('/')

  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/icons/sunset/apple-touch-icon-180x180.png',
  )
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute(
    'href',
    '/icons/sunset/icon.svg',
  )
  expect((await request.get('/icons/sunset/apple-touch-icon-180x180.png')).ok()).toBe(true)
})

test('ignores a cached app icon that is not a plain name', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('calculator-appearance', JSON.stringify({ appIcon: '../evil' }))
  })

  await page.goto('/')

  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/apple-touch-icon-180x180.png',
  )
})
