import type { Page } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { activePage, expect, localDay, logIn, test } from './backend.ts'
import { addIngredient } from './cook.ts'

/** name → amount of one person's items in a meal of today, as stored on the server */
async function loggedItems(admin: SupabaseClient, userId: string, mealType: string) {
  const { data } = await admin
    .from('meal_items')
    .select('name, entered_amount, kcal, meals!inner(user_id, date, meal_type)')
    .eq('meals.user_id', userId)
    .eq('meals.date', localDay())
    .eq('meals.meal_type', mealType)
    .order('name')
  return data?.map((item) => `${item.name} ${item.entered_amount} (${item.kcal})`) ?? []
}

function openTab(page: Page, name: string) {
  return page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name }).click()
}

test('a dish saved as a recipe is cooked again at the ingredient’s new values', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Lukas')
  const partner = await backend.user('Lisa')
  const household = await backend.household([me, partner])
  const { data: patty } = await backend.admin
    .from('ingredients')
    .insert({ household_id: household, name: 'Patty', kcal_100: 240 })
    .select('id')
    .single()
  await logIn(page, me)

  // burgers for both, saved as a recipe before logging lunch
  await openTab(page, 'Cook')
  const cook = activePage(page)
  await cook.getByRole('button', { name: 'baby', pressed: false }).click()
  await cook.getByRole('radio', { name: 'Lunch' }).click()
  await addIngredient(page, 'Patty', '300')
  await cook.getByRole('button', { name: 'Save as recipe' }).click()
  const sheet = page.getByRole('dialog', { name: 'Save as recipe' })
  await sheet.getByLabel('Recipe name').fill('Burgers')
  await sheet.getByRole('button', { name: 'Save recipe' }).click()
  await expect(sheet).toBeHidden()
  await cook.getByRole('button', { name: 'Save meal' }).click()
  await expect
    .poll(() => loggedItems(backend.admin, partner.id, 'lunch'))
    .toEqual(['Patty 150 (240)'])

  // the patty gets leaner; dinner is the recipe again
  await backend.admin
    .from('ingredients')
    .update({ kcal_100: 200 })
    .eq('id', patty?.id ?? '')
  await openTab(page, 'Cook')
  await activePage(page)
    .getByRole('button', { name: /Recipes/ })
    .click()
  await activePage(page)
    .getByRole('button', { name: /Burgers/ })
    .click()
  await expect(activePage(page).getByRole('heading', { name: 'Burgers' })).toBeVisible()
  await activePage(page).getByRole('button', { name: 'Cook this' }).click()
  const again = activePage(page)
  await expect(again.getByRole('button', { name: 'baby', pressed: true })).toBeVisible()
  // 300 g at 200 kcal per 100 g, halved (the old value would give 360 each)
  await expect(again.getByTestId('dish-totals')).toContainText(/Lukas.*300 kcal.*baby.*300 kcal/)
  await again.getByRole('radio', { name: 'Dinner' }).click()
  await again.getByRole('button', { name: 'Save meal' }).click()

  await expect.poll(() => loggedItems(backend.admin, me.id, 'dinner')).toEqual(['Patty 150 (200)'])
  await expect
    .poll(() => loggedItems(backend.admin, partner.id, 'dinner'))
    .toEqual(['Patty 150 (200)'])
})

test('a logged meal is copied to another meal and saved as a recipe', async ({ page, backend }) => {
  const me = await backend.user('Lukas')
  const partner = await backend.user('Lisa')
  const household = await backend.household([me, partner])
  await backend.admin.from('ingredients').insert([
    { household_id: household, name: 'Toast', kcal_100: 260 },
    { household_id: household, name: 'Jam', kcal_100: 250 },
  ])
  await logIn(page, me)

  await openTab(page, 'Cook')
  const cook = activePage(page)
  await cook.getByRole('radio', { name: 'Breakfast' }).click()
  await addIngredient(page, 'Toast', '60')
  await addIngredient(page, 'Jam', '20')
  await cook.getByRole('button', { name: 'Save meal' }).click()

  // the same breakfast for her, as a snack
  const sheet = page.getByRole('dialog')
  await activePage(page)
    .getByRole('button', { name: /Breakfast/ })
    .click()
  await sheet.getByRole('button', { name: 'Copy to…' }).click()
  await sheet.getByRole('radio', { name: /baby/ }).click()
  await sheet.getByRole('radio', { name: 'Snacks' }).click()
  await sheet.getByRole('button', { name: 'Copy meal' }).click()
  await expect(sheet.getByRole('status')).toContainText('for baby')
  await expect
    .poll(() => loggedItems(backend.admin, partner.id, 'snack'))
    .toEqual(['Jam 20 (250)', 'Toast 60 (260)'])

  // and kept as a recipe
  await sheet.getByRole('button', { name: 'Save as recipe' }).click()
  await sheet.getByLabel('Recipe name').fill('Jam toast')
  await sheet.getByRole('button', { name: 'Save recipe' }).click()
  await expect(sheet.getByRole('status')).toContainText('Saved as a recipe')
  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('recipes')
        .select('name, recipe_lines(name)')
        .eq('household_id', household)
      return data?.map((recipe) => [recipe.name, recipe.recipe_lines.length])
    })
    .toEqual([['Jam toast', 2]])
})
