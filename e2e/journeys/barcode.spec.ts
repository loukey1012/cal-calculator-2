import { fileURLToPath } from 'node:url'
import { activePage, expect, logIn, test } from './backend.ts'

const NUTELLA_PHOTO = fileURLToPath(new URL('../fixtures/ean13-nutella.png', import.meta.url))
const NUTELLA = '3017620422003'

test('scan a package: a photo is read, filled in from Open Food Facts, saved; found again by number', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Ben')
  const household = await backend.household([me])
  // Open Food Facts answers from here, so the journey doesn't depend on it being up
  await page.route('https://world.openfoodfacts.org/api/v2/product/**', (route) =>
    route.fulfill({
      json: {
        status: 1,
        product: {
          product_name: 'Nutella',
          brands: 'Ferrero',
          serving_quantity: 15,
          nutriments: { 'energy-kcal_100g': 539, fat_100g: 30.9, proteins_100g: 6.3 },
        },
      },
    }),
  )
  await logIn(page, me)
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'Ingredients' })
    .click()
  const ingredients = activePage(page)

  // the real scanner engine reads the barcode in a photo
  await ingredients.getByRole('button', { name: 'Scan barcode' }).click()
  const scanner = page.getByRole('dialog', { name: 'Scan barcode' })
  await expect(scanner).toBeVisible()
  await scanner.getByLabel('Photo of the barcode').setInputFiles(NUTELLA_PHOTO)

  const sheet = page.getByRole('dialog', { name: 'New Ingredient' })
  await expect(sheet.getByText(/Filled in from Open Food Facts/)).toBeVisible()
  await expect(sheet.getByLabel('Name', { exact: true })).toHaveValue('Nutella')
  await expect(sheet.getByLabel('Barcode', { exact: true })).toHaveValue(NUTELLA)
  await expect(sheet.getByLabel('Calories per 100 g', { exact: true })).toHaveValue('539')
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()
  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('ingredients')
        .select('name, barcode, kcal_100, kcal_unit, unit_weight_g')
        .eq('household_id', household)
      return data
    })
    .toEqual([
      // per portion worked out from per 100 g: 539 × 0.15
      { name: 'Nutella', barcode: NUTELLA, kcal_100: 539, kcal_unit: 81, unit_weight_g: 15 },
    ])

  // typing the number finds the saved package
  await ingredients.getByRole('button', { name: 'Scan barcode' }).click()
  await scanner.getByRole('button', { name: 'Type number' }).click()
  await scanner.getByLabel('Barcode number').fill('3017620 422003')
  await scanner.getByRole('button', { name: 'Use number' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Edit Ingredient' }).getByLabel('Name', { exact: true }),
  ).toHaveValue('Nutella')
})
