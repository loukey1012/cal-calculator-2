import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { activePage, expect, logIn, test } from './backend.ts'

const NUTELLA_PHOTO = fileURLToPath(new URL('../fixtures/ean13-nutella.png', import.meta.url))
const FAKE_CAMERA = fileURLToPath(new URL('../fixtures/fake-camera.js', import.meta.url))

test('the live camera reads a package on Cook and goes straight to its amount', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Cam')
  const household = await backend.household([me])
  await backend.admin
    .from('ingredients')
    .insert({ household_id: household, name: 'Nutella', kcal_100: 539, barcode: '3017620422003' })
  // the "camera" films the barcode: a canvas stream, read by the real scanner like a camera
  const picture = `data:image/png;base64,${readFileSync(NUTELLA_PHOTO).toString('base64')}`
  await page.addInitScript({ content: `window.__fakeCameraPicture = ${JSON.stringify(picture)}` })
  await page.addInitScript({ path: FAKE_CAMERA })
  await logIn(page, me)

  await page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: 'Cook' }).click()
  await activePage(page).getByRole('button', { name: 'Add ingredient' }).click()
  await activePage(page).getByRole('button', { name: 'Scan barcode' }).click()

  // read from the live video; the scanner closes by itself
  await expect(page.getByRole('dialog', { name: 'Scan barcode' })).toBeHidden({ timeout: 15_000 })
  const amount = activePage(page)
  await expect(amount.getByRole('heading', { name: 'Nutella' })).toBeVisible()
  await amount.getByLabel('Amount').fill('20')
  await expect(amount.getByTestId('line-preview')).toContainText('108 kcal')
})
