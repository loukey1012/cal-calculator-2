import { activePage, expect, logIn, test } from './backend.ts'

const pad = (value: number) => String(value).padStart(2, '0')

/** A day of last calendar week (Monday-first), so the seeded days never depend on today's date. */
function lastWeekDay(dayIndex: number): Date {
  const now = new Date()
  const sinceMonday = (now.getDay() + 6) % 7
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - sinceMonday - 7 + dayIndex)
}

const dateString = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

test('the week page adds up the calories saved over the counted days, opens from the calendar and steps between weeks', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Greta')
  await backend.household([me])
  const monday = dateString(lastWeekDay(0))
  const tuesday = dateString(lastWeekDay(1))
  const cheatDay = dateString(lastWeekDay(2))

  // Arrange: 2,500 kcal burned a day (a profile setting), a goal, two complete days (1,800 and 2,000 kcal)
  // and a cheat day with a lot of food, which must not take part in any figure
  await backend.admin.from('goal_history').insert({
    user_id: me.id,
    valid_from: dateString(lastWeekDay(-14)),
    kcal: 2000,
  })
  await backend.admin.from('profiles').update({ kcal_burned: 2500 }).eq('id', me.id)
  const seeded: ReadonlyArray<readonly [string, number, number]> = [
    [monday, 800, 1000],
    [tuesday, 1000, 1000],
    [cheatDay, 3000, 4000],
  ]
  for (const [date, lunch, dinner] of seeded) {
    for (const [mealType, kcal] of [
      ['lunch', lunch],
      ['dinner', dinner],
    ] as const) {
      const { data: meal } = await backend.admin
        .from('meals')
        .insert({ user_id: me.id, date, meal_type: mealType })
        .select('id')
        .single()
      await backend.admin.from('meal_items').insert({
        meal_id: meal?.id,
        name: `Seeded ${mealType}`,
        entered_amount: 1,
        entered_unit: 'unit',
        basis: 'per_unit',
        basis_multiplier: 1,
        kcal,
      })
    }
  }
  await backend.admin.from('cheat_days').insert({ user_id: me.id, date: cheatDay, kind: 'cheat' })

  await logIn(page, me)
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'History' })
    .click()
  const history = activePage(page)

  // opening a day of that week makes the week bar under the calendar show the week's average and
  // what it saved, from the two counted days only
  const lastSunday = lastWeekDay(6)
  if (lastSunday.getMonth() !== new Date().getMonth()) {
    await history.getByRole('button', { name: 'Previous month' }).click()
  }
  await history.locator(`button[data-date="${dateString(lastSunday)}"]`).click()
  const weekButton = history.getByRole('button', {
    name: /^Week \d+, average 1,900 kcal, 1,200 kcal saved$/,
  })
  await expect(weekButton).toBeVisible()

  // Act: the bar opens the week's page
  await weekButton.click()
  const week = activePage(page)
  await expect(week.getByRole('heading', { level: 1, name: /^Week \d+$/ })).toBeVisible()
  await expect(page).toHaveURL(/\/history\/week-\d{4}-\d{2}$/)

  // Assert: burned 2 × 2,500, ate 1,800 + 2,000; the cheat day is not counted anywhere
  const saved = week.getByRole('region', { name: 'Saved this week' })
  await expect(saved.getByText('1,200 kcal', { exact: true }).first()).toBeVisible()
  await expect(saved).toContainText('Burned 5,000 · ate 3,800 · 2 counted days')
  await expect(week.getByText(/^2 counted · 1 cheat day/)).toBeVisible()
  // (the calendar below the page is still there while it slides in: look inside the strip)
  const strip = week.getByRole('list', { name: 'Days of the week' })
  await expect(strip.locator(`button[data-date="${cheatDay}"]`)).toHaveAttribute(
    'data-status',
    'cheatDay',
  )
  await expect(week.getByRole('region', { name: 'Averages' })).toContainText(
    'Ø 1,900 kcal of 2,000',
  )
  await expect(week.getByText('7,000')).toHaveCount(0)

  // the next week is the running one; the previous week leads back
  await week.getByRole('button', { name: 'Next week' }).click()
  await expect(week.getByRole('heading', { level: 1, name: 'This week' })).toBeVisible()
  await expect(week.getByRole('button', { name: 'Next week' })).toBeDisabled()
  await week.getByRole('button', { name: 'Previous week' }).click()
  await expect(week.getByRole('heading', { level: 1, name: /^Week \d+$/ })).toBeVisible()

  // a day of the strip opens in the calendar, that day open
  await strip.locator(`button[data-date="${tuesday}"]`).click()
  await expect(page).toHaveURL(new RegExp(`/history/${tuesday}$`))
  // (the week page slides away over the calendar: only the calendar's day is pressable)
  await expect(history.locator(`button[data-date="${tuesday}"][aria-pressed="true"]`)).toBeVisible()

  // the week bar opens the open day's week again; Back returns to the calendar, the day still open
  await history.getByRole('button', { name: /^Week \d+, average/ }).click()
  await expect(week.getByRole('heading', { level: 1, name: /^Week \d+$/ })).toBeVisible()
  await week.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL(new RegExp(`/history/${tuesday}$`))
  await expect(history.getByRole('button', { name: 'Calendar options' })).toBeVisible()
  // (the week page slides away over the calendar: only the calendar's day is pressable)
  await expect(history.locator(`button[data-date="${tuesday}"][aria-pressed="true"]`)).toBeVisible()
})
