import { activePage, expect, logIn, test } from './backend.ts'

test('manage categories: add a broad category and a category in it, move, rename and delete', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Cora')
  const household = await backend.household([me])
  await logIn(page, me)
  await page.goto('/settings/categories')
  const settings = activePage(page)
  const sheet = page.getByRole('dialog')
  const groupOf = async (name: string) => {
    const { data } = await backend.admin
      .from('categories')
      .select('group_id, category_groups(name)')
      .eq('household_id', household)
      .eq('name', name)
      .single()
    return (data?.category_groups as unknown as { name: string } | null)?.name ?? null
  }

  for (const name of ['Fresh', 'Sea']) {
    await settings.getByRole('button', { name: 'Add Broad Category' }).click()
    await sheet.getByLabel('Name').fill(name)
    await sheet.getByRole('button', { name: 'Save' }).click()
    await expect(sheet).toBeHidden()
  }

  await settings.getByRole('button', { name: 'Add Category' }).click()
  await sheet.getByLabel('Name').fill('Fish')
  await sheet.getByLabel('Broad category').selectOption({ label: 'Fresh' })
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()
  expect(await groupOf('Fish')).toBe('Fresh')

  // move it to the other broad category, renaming it on the way
  await settings.getByRole('button', { name: /^Fish/ }).click()
  await sheet.getByLabel('Name').fill('Seafood')
  await sheet.getByLabel('Broad category').selectOption({ label: 'Sea' })
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()
  await expect.poll(() => groupOf('Seafood')).toBe('Sea')

  // a broad category is only deleted once it is empty
  page.once('dialog', (dialog) => void dialog.accept())
  await settings.getByRole('button', { name: /^Fresh/ }).click()
  await sheet.getByRole('button', { name: 'Delete Broad Category' }).click()
  await expect(sheet).toBeHidden()
  await expect(settings.getByRole('button', { name: /^Fresh/ })).toBeHidden()
  await settings
    .getByRole('button', { name: /^Sea\b/ })
    .first()
    .click()
  await expect(sheet.getByText('first move or delete its 1 category')).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Delete Broad Category' })).toHaveCount(0)
  await sheet.getByRole('button', { name: 'Close' }).click()
  await expect(sheet).toBeHidden()

  page.once('dialog', (dialog) => void dialog.accept())
  await settings.getByRole('button', { name: /^Seafood/ }).click()
  await sheet.getByRole('button', { name: 'Delete Category' }).click()
  await expect(settings.getByRole('button', { name: /^Seafood/ })).toBeHidden()

  const { count } = await backend.admin
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', household)
  expect(count).toBe(0)
})
