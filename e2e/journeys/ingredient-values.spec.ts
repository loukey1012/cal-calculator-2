import type { Page } from '@playwright/test'
import { activePage, expect, logIn, test } from './backend.ts'

const BARCODE = '3017620422003'

/** Open Food Facts answers from here, so the journeys don't depend on it being up. */
function offAnswers(page: Page, product: Record<string, unknown>) {
  return page.route('https://world.openfoodfacts.org/api/v2/product/**', (route) =>
    route.fulfill({ json: { status: 1, product } }),
  )
}

async function typeBarcode(page: Page) {
  await activePage(page).getByRole('button', { name: 'Scan barcode' }).click()
  const scanner = page.getByRole('dialog', { name: 'Scan barcode' })
  await scanner.getByRole('button', { name: 'Type number' }).click()
  await scanner.getByLabel('Barcode number').fill(BARCODE)
  await scanner.getByRole('button', { name: 'Use number' }).click()
}

test('a scanned portion of 3 biscuits is split into single units; a wrong value is cleared', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Bea')
  const household = await backend.household([me])
  await offAnswers(page, {
    product_name: 'Butterkeks',
    brands: 'Leibniz',
    serving_quantity: 30,
    serving_size: '3 Kekse (30 g)',
    nutriments: {
      'energy-kcal_100g': 440,
      proteins_100g: 7,
      sugars_100g: 99,
      'energy-kcal_serving': 132,
    },
  })
  await logIn(page, me)
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'Ingredients' })
    .click()

  await typeBarcode(page)
  const sheet = page.getByRole('dialog', { name: 'New Ingredient' })
  await expect(sheet.getByText('Portion on the package: 3 Kekse (30 g)')).toBeVisible()
  await sheet.getByRole('button', { name: 'Split into smaller units…' }).click()
  await expect(sheet.getByLabel('Units in one portion')).toHaveValue('3')
  await sheet.getByRole('button', { name: 'Split', exact: true }).click()
  await expect(sheet.getByLabel('Calories per unit', { exact: true })).toHaveValue('44')
  await expect(sheet.getByLabel('Grams per unit', { exact: true })).toHaveValue('10')
  await sheet.getByRole('button', { name: 'Clear Sugar per 100 g' }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()

  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('ingredients')
        .select('name, kcal_100, sugar_100, kcal_unit, unit_weight_g')
        .eq('household_id', household)
      return data
    })
    .toEqual([
      { name: 'Butterkeks', kcal_100: 440, sugar_100: null, kcal_unit: 44, unit_weight_g: 10 },
    ])
})

test('on Cook, an unknown package goes to the saved ingredient it is; an estimated one marks the dish', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Cleo')
  const household = await backend.household([me])
  // one insert each: a bulk insert sends null for the keys a row leaves out
  await backend.admin
    .from('ingredients')
    .insert({ household_id: household, name: 'Skyr', brand: 'Milbona', kcal_100: 63 })
  await backend.admin.from('ingredients').insert({
    household_id: household,
    name: 'Pizza from Luigi',
    kcal_unit: 900,
    unit_label: 'pizza',
    kcal_estimated: true,
  })
  await offAnswers(page, {
    product_name: 'Skyr Natur',
    brands: 'Milbona',
    nutriments: { 'energy-kcal_100g': 62 },
  })
  await logIn(page, me)
  await page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: 'Cook' }).click()
  const cook = activePage(page)

  await cook.getByRole('button', { name: 'Add ingredient' }).click()
  await typeBarcode(page)
  await expect(cook.getByText('Is this Skyr (Milbona)?')).toBeVisible()
  await cook.getByRole('button', { name: 'Use Skyr' }).click()
  await cook.getByLabel('Amount').fill('150')
  await cook.getByRole('button', { name: 'Add to dish' }).click()

  await cook.getByRole('button', { name: 'Add ingredient' }).click()
  await cook.getByRole('button', { name: /Pizza from Luigi/ }).click()
  await cook.getByRole('button', { name: '1/2' }).click()
  await cook.getByRole('button', { name: 'Add to dish' }).click()
  await expect(cook.getByRole('switch', { name: 'Calories are an estimate' })).toBeChecked()
  await expect(cook.getByText('Pizza from Luigi is marked as an estimate.')).toBeVisible()
  await cook.getByRole('button', { name: 'Save meal' }).click()

  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('dishes')
        .select('kcal_estimated')
        .eq('household_id', household)
      return data
    })
    .toEqual([{ kcal_estimated: true }])
  const { data: skyr } = await backend.admin
    .from('ingredients')
    .select('barcode')
    .eq('household_id', household)
    .eq('name', 'Skyr')
    .single()
  expect(skyr).toEqual({ barcode: BARCODE })
})

test('food without a label gets the values of a similar product found by name', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Dora')
  const household = await backend.household([me])
  // the app searches through its own address; answered here instead of by Open Food Facts
  await page.route('**/off/search?*', (route) =>
    route.fulfill({
      json: {
        hits: [
          {
            code: '7313700161494',
            product_name: 'Laugenbrezel',
            brands: ['Anna’s Best'],
            nutriments: { 'energy-kcal_100g': 376 },
          },
        ],
      },
    }),
  )
  await logIn(page, me)
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'Ingredients' })
    .click()
  await activePage(page).getByRole('button', { name: 'Add ingredient' }).click()
  const sheet = page.getByRole('dialog', { name: 'New Ingredient' })

  await sheet.getByLabel('Name', { exact: true }).fill('Brezel vom Bäcker')
  await sheet.getByRole('button', { name: 'Search Open Food Facts' }).click()
  await sheet.getByRole('searchbox', { name: 'Search Open Food Facts' }).fill('Laugenbrezel')
  await sheet.getByRole('button', { name: 'Search', exact: true }).click()
  await sheet.getByRole('button', { name: /Laugenbrezel/ }).click()
  await expect(sheet.getByLabel('Calories per 100 g', { exact: true })).toHaveValue('376')
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()

  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('ingredients')
        .select('name, brand, barcode, kcal_100')
        .eq('household_id', household)
      return data
    })
    .toEqual([{ name: 'Brezel vom Bäcker', brand: 'Anna’s Best', barcode: null, kcal_100: 376 }])
})
