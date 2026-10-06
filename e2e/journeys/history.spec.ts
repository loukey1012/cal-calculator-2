import { activePage, expect, localDay, logIn, test } from './backend.ts'
import { cookFor } from './cook.ts'

test('select a past day in History and add a forgotten dinner beneath the calendar', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Hanna')
  await backend.household([me])
  const yesterday = localDay(1)
  await backend.admin
    .from('goal_history')
    .insert({ user_id: me.id, valid_from: localDay(30), kcal: 2000 })
  const { data: meal } = await backend.admin
    .from('meals')
    .insert({ user_id: me.id, date: yesterday, meal_type: 'lunch' })
    .select('id')
    .single()
  await backend.admin.from('meal_items').insert({
    meal_id: meal?.id,
    name: 'Seeded lunch',
    entered_amount: 1,
    entered_unit: 'unit',
    basis: 'per_unit',
    basis_multiplier: 1,
    kcal: 1800,
  })
  await logIn(page, me)
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'History' })
    .click()
  const history = activePage(page)
  // previous month if yesterday was the last day of it
  if (yesterday.slice(0, 7) !== localDay().slice(0, 7)) {
    await history.getByRole('button', { name: 'Previous month' }).click()
  }

  await history.getByRole('button', { name: /within goal/ }).click()
  await expect(page).toHaveURL(new RegExp(`/history/${yesterday}$`))
  // reopening the app keeps the day selected, without sliding half of a neighbour into view
  await page.reload()
  const day = history.getByRole('region')
  await expect(day).toBeVisible()
  await expect(history.getByRole('button', { pressed: true })).toBeVisible()
  const carousel = page.locator('[data-testid="tab-page"]').first().locator('xpath=../..')
  expect(await carousel.evaluate((element) => element.scrollLeft)).toBe(0)
  // the empty dinner opens Cook for that day, and saving comes back here
  await cookFor(day, page, /Dinner/)
  const cook = activePage(page)
  await expect(cook.getByLabel('Day')).toHaveValue(localDay(1))
  await cook.getByRole('button', { name: 'Add ingredient' }).click()
  await cook.getByRole('button', { name: /Custom item/ }).click()
  await cook.getByLabel('Name', { exact: true }).fill('Forgotten pizza')
  await cook.getByRole('radio', { name: 'Per unit' }).click()
  await cook.getByLabel('Calories').fill('450')
  await cook.getByLabel('Amount').fill('1')
  await cook.getByRole('button', { name: 'Add to dish' }).click()
  await cook.getByRole('button', { name: 'Save meal' }).click()
  await expect(day.getByTestId('day-total')).toContainText('2,250 kcal')
  // the calendar above updates right away
  await expect(history.getByRole('button', { name: /over goal/, pressed: true })).toBeVisible()
  const { data } = await backend.admin
    .from('meals')
    .select('meal_type, meal_items(name)')
    .eq('user_id', me.id)
    .eq('date', yesterday)
    .eq('meal_type', 'dinner')
  expect(data).toEqual([{ meal_type: 'dinner', meal_items: [{ name: 'Forgotten pizza' }] }])
})
