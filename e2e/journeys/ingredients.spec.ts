import { activePage, expect, logIn, test } from './backend.ts'

test('add, find, edit and delete an ingredient; its empty category goes with it', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Ingrid')
  const household = await backend.household([me])
  await logIn(page, me)
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'Ingredients' })
    .click()
  const ingredients = activePage(page)
  const sheet = page.getByRole('dialog')

  await ingredients.getByRole('button', { name: 'Add ingredient' }).click()
  await sheet.getByLabel('Name', { exact: true }).fill('Käse gerieben')
  await sheet.getByLabel('Category').selectOption({ label: 'New category…' })
  await sheet.getByLabel('New category name').fill('Dairy')
  await sheet.getByRole('switch', { name: 'Per 100 g' }).click()
  await sheet.getByLabel('Calories per 100 g').fill('350,4')
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()

  await ingredients.getByRole('searchbox', { name: 'Search ingredients' }).fill('kase')
  await expect(ingredients.getByRole('button', { name: /Käse gerieben/ })).toContainText(
    '351 kcal / 100 g',
  )

  await ingredients.getByRole('button', { name: /Käse gerieben/ }).click()
  await sheet.getByLabel('Name', { exact: true }).fill('Käse gerieben (Gouda)')
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(ingredients.getByRole('button', { name: /Gouda/ })).toBeVisible()

  page.once('dialog', (dialog) => void dialog.accept())
  await ingredients.getByRole('button', { name: /Gouda/ }).click()
  await sheet.getByRole('button', { name: 'Delete Ingredient' }).click()
  await expect(ingredients.getByText('No ingredients yet')).toBeVisible()

  const { count } = await backend.admin
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', household)
  expect(count).toBe(0)
})
