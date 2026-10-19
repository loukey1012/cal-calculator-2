import { activePage, dayLabel, expect, localDay, logIn, test } from './backend.ts'

test('a cheat meal today, and a past cheat day in History', async ({ page, backend }) => {
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
    name: 'Birthday cake',
    entered_amount: 1,
    entered_unit: 'unit',
    basis: 'per_unit',
    basis_multiplier: 1,
    kcal: 2600,
  })
  await logIn(page, me)

  // today: dinner was a cheat meal, with nothing logged for it
  const today = activePage(page)
  await today.getByRole('button', { name: 'Day options' }).click()
  const options = page.getByRole('dialog', { name: 'Day' })
  await options.getByRole('switch', { name: 'Dinner' }).click()
  await expect(options.getByRole('switch', { name: 'Dinner' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await options.getByRole('button', { name: 'Close' }).click()
  await expect(today.getByRole('button', { name: /Dinner/ })).toContainText('Cheat meal')
  await expect(today.getByTestId('day-total')).toContainText('Cheat meal')
  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('meals')
        .select('meal_type, cheat_meal')
        .eq('user_id', me.id)
        .eq('date', localDay())
      return data
    })
    .toEqual([{ meal_type: 'dinner', cheat_meal: true }])

  // yesterday had only a lunch (flagged), and it was a cheat day
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'History' })
    .click()
  const history = activePage(page)
  if (yesterday.slice(0, 7) !== localDay().slice(0, 7)) {
    await history.getByRole('button', { name: 'Previous month' }).click()
  }
  await history
    .getByRole('button', { name: dayLabel(yesterday, 'lunch or dinner missing') })
    .click()
  const day = history.getByRole('region')
  await day.getByRole('button', { name: 'Day options' }).click()
  await page.getByRole('dialog', { name: 'Day' }).getByRole('switch', { name: 'Cheat day' }).click()
  await page.getByRole('dialog', { name: 'Day' }).getByRole('button', { name: 'Close' }).click()

  await expect(day.getByTestId('day-total')).toContainText('Cheat day')
  await expect(history.getByRole('button', { name: /cheat day/, pressed: true })).toBeVisible()
  await expect(history.getByTestId('month-summary')).toContainText('left out')
  await expect
    .poll(async () => {
      const { data } = await backend.admin.from('cheat_days').select('date').eq('user_id', me.id)
      return data
    })
    .toEqual([{ date: yesterday }])
})
