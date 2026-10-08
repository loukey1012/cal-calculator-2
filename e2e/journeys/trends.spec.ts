import { activePage, expect, localDay, logIn, test } from './backend.ts'

test('weight entered for today and an earlier day; Trends show calories and weight with the goal', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Theo')
  await backend.household([me])
  await backend.admin.from('goal_history').insert({
    user_id: me.id,
    valid_from: localDay(60),
    kcal: 2000,
    protein_g: 120,
    weight_goal_kg: 68,
  })
  for (const [daysAgo, kcal] of [
    [3, 1800],
    [1, 2200],
  ] as const) {
    const { data: meal } = await backend.admin
      .from('meals')
      .insert({ user_id: me.id, date: localDay(daysAgo), meal_type: 'lunch' })
      .select('id')
      .single()
    await backend.admin.from('meal_items').insert({
      meal_id: meal?.id,
      name: 'Seeded lunch',
      entered_amount: 1,
      entered_unit: 'unit',
      basis: 'per_unit',
      basis_multiplier: 1,
      kcal,
      protein: 100,
    })
  }
  await logIn(page, me)
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'History' })
    .click()
  const history = activePage(page)
  await history.getByRole('radio', { name: 'Trends' }).click()

  // only what has a goal: calories, protein, and weight (it has a target)
  const chips = history.getByRole('group', { name: 'Show' }).getByRole('button')
  await expect(chips).toHaveText(['Calories', 'Protein', 'Weight'])
  const calories = history.getByRole('region', { name: 'Calories chart' })
  await expect(calories.getByTestId('trend-bar')).toHaveCount(2)
  await expect(history.getByTestId('trend-stats')).toContainText('2,000 kcal')

  // weight: an earlier day first, then today
  await history.getByRole('button', { name: 'Weight' }).click()
  const sheet = page.getByRole('dialog', { name: 'Weight' })
  for (const [day, weight] of [
    [localDay(10), '73,2'],
    [localDay(), '72,4'],
  ] as const) {
    await history.getByRole('button', { name: 'Add weight' }).click()
    await sheet.getByLabel('Day').fill(day)
    await sheet.getByLabel('Weight').fill(weight)
    await sheet.getByRole('button', { name: 'Save' }).click()
    await expect(sheet).toBeHidden()
  }
  const stats = history.getByTestId('trend-stats')
  await expect(stats).toContainText('Current72.4 kg')
  await expect(stats).toContainText('4.4 kg')
  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('weight_entries')
        .select('date, weight_kg')
        .eq('user_id', me.id)
        .order('date')
      return data
    })
    .toEqual([
      { date: localDay(10), weight_kg: 73.2 },
      { date: localDay(), weight_kg: 72.4 },
    ])

  // the weight counts on the days after it, also in the calendar's day view
  await page.goto(`/history/${localDay(3)}`)
  await expect(activePage(page).getByRole('button', { name: /Weight/ })).toContainText('73.2 kg')
})
