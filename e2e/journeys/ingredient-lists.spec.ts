import { activePage, expect, logIn, pickBasics, test } from './backend.ts'
import { addIngredient } from './cook.ts'

function openTab(page: import('@playwright/test').Page, tab: string) {
  return page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: tab }).click()
}

test('a drink saved in ml is logged in ml', async ({ page, backend }) => {
  const me = await backend.user('Mila')
  await backend.category(await backend.household([me]))
  await logIn(page, me)
  const sheet = page.getByRole('dialog')

  await openTab(page, 'Ingredients')
  await activePage(page).getByRole('button', { name: 'Add ingredient' }).click()
  await sheet.getByLabel('Name', { exact: true }).fill('Hafer Drink')
  await sheet.getByRole('radio', { name: 'Millilitres' }).click()
  await sheet.getByRole('switch', { name: 'Per 100 ml' }).click()
  await sheet.getByLabel('Calories per 100 ml').fill('46')
  await sheet.getByLabel('Unit name').fill('glass')
  await sheet.getByLabel('Millilitres per unit', { exact: true }).fill('250')
  await pickBasics(sheet)
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toBeHidden()
  await expect(activePage(page).getByRole('button', { name: /Hafer Drink/ })).toContainText(
    '46 kcal / 100 ml',
  )

  await openTab(page, 'Cook')
  const cook = activePage(page)
  await cook.getByRole('heading', { level: 1, name: 'Cook' }).waitFor()
  await addIngredient(page, 'Hafer Drink', '300')
  await expect(cook.getByText('300 ml · shared')).toBeVisible()
  await cook.getByRole('button', { name: 'Save meal' }).click()

  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('meal_items')
        .select('entered_amount, entered_unit, kcal, basis_multiplier, meals!inner(user_id)')
        .eq('meals.user_id', me.id)
      return data?.map((item) => [
        Number(item.entered_amount),
        item.entered_unit,
        Number(item.basis_multiplier),
      ])
    })
    .toEqual([[300, 'ml', 3]])
})

test('the newest ingredient is on top, brands can be filtered, and the order is saved', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Bruno')
  const household = await backend.household([me])
  for (const [name, brand, createdAt] of [
    ['Skyr', 'Milbona', '2026-10-01T10:00:00Z'],
    ['Apfel', null, '2026-10-03T10:00:00Z'],
    ['Quark', 'Milbona', '2026-10-02T10:00:00Z'],
  ] as const) {
    await backend.admin.from('ingredients').insert({
      household_id: household,
      category_id: await backend.category(household),
      name,
      brand,
      kcal_100: 60,
      created_at: createdAt,
    })
  }
  await logIn(page, me)
  await openTab(page, 'Ingredients')
  const list = activePage(page)
  const sheet = page.getByRole('dialog')
  const rows = list.getByRole('button', { name: /kcal \/ 100 g/ })

  await expect(rows.first()).toContainText('Apfel')
  await expect(rows.nth(0)).not.toContainText('Milbona')
  await expect(rows.nth(1)).toContainText('MilbonaQuark')

  await list.getByRole('button', { name: 'Brand: All brands' }).click()
  await sheet.getByRole('button', { name: /Milbona/ }).click()
  await expect(rows).toHaveCount(2)

  await list.getByRole('button', { name: 'Sort: Newest first' }).click()
  await sheet.getByRole('button', { name: /A–Z/ }).click()
  await expect(rows.first()).toContainText('Quark')

  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('profiles')
        .select('appearance')
        .eq('id', me.id)
        .single()
      return (data?.appearance as { ingredientSort?: string } | null)?.ingredientSort
    })
    .toBe('name')
})
