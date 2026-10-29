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
  await options.getByRole('button', { name: 'Save' }).click()
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
  await page
    .getByRole('dialog', { name: 'Day' })
    .getByRole('radiogroup', { name: 'Day mark' })
    .getByRole('radio', { name: 'Cheat day' })
    .click()
  await page.getByRole('dialog', { name: 'Day' }).getByRole('button', { name: 'Save' }).click()

  await expect(day.getByTestId('day-total')).toContainText('Cheat day')
  await expect(history.getByRole('button', { name: /cheat day/, pressed: true })).toBeVisible()
  // left out of the averages: the open day says so, and the calendar cell is the cheat day
  await expect(day.getByTestId('day-status')).toContainText('Cheat day · not counted')
  await expect
    .poll(async () => {
      const { data } = await backend.admin.from('cheat_days').select('date').eq('user_id', me.id)
      return data
    })
    .toEqual([{ date: yesterday }])
})

test('a past day marked as alcohol day, then cheat day, then none', async ({ page, backend }) => {
  const me = await backend.user('Mira')
  await backend.household([me])
  const date = localDay(2)
  const marks = async () => {
    const { data } = await backend.admin
      .from('cheat_days')
      .select('date, kind')
      .eq('user_id', me.id)
    return data
  }
  await logIn(page, me)

  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'History' })
    .click()
  const history = activePage(page)
  if (date.slice(0, 7) !== localDay().slice(0, 7)) {
    await history.getByRole('button', { name: 'Previous month' }).click()
  }
  const [year, month, dayOfMonth] = date.split('-').map(Number)
  const dayName = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(
    new Date(year ?? 0, (month ?? 1) - 1, dayOfMonth),
  )
  await history.getByRole('button', { name: new RegExp(`^${dayName}, `) }).click()
  const day = history.getByRole('region')
  await day.getByRole('button', { name: 'Day options' }).click()
  const options = page.getByRole('dialog', { name: 'Day' })
  const dayMark = options.getByRole('radiogroup', { name: 'Day mark' })

  await dayMark.getByRole('radio', { name: 'Alcohol day' }).click()
  await options.getByRole('button', { name: 'Save' }).click()
  await expect(day.getByTestId('day-total')).toContainText('Alcohol day')
  await expect(history.getByRole('button', { name: dayLabel(date, 'alcohol day') })).toBeVisible()
  await expect.poll(marks).toEqual([{ date, kind: 'alcohol' }])

  await day.getByRole('button', { name: 'Day options' }).click()
  await dayMark.getByRole('radio', { name: 'Cheat day' }).click()
  await options.getByRole('button', { name: 'Save' }).click()
  await expect.poll(marks).toEqual([{ date, kind: 'cheat' }])
  await expect(day.getByTestId('day-total')).toContainText('Cheat day')
  await expect(day.getByTestId('day-total')).not.toContainText('Alcohol day')

  await day.getByRole('button', { name: 'Day options' }).click()
  await dayMark.getByRole('radio', { name: 'None' }).click()
  await options.getByRole('button', { name: 'Save' }).click()
  await expect.poll(marks).toEqual([])
})

test('closing the day options with edits asks first, and Cancel keeps them', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Lena')
  await backend.household([me])
  await logIn(page, me)
  const today = activePage(page)
  await today.getByRole('button', { name: 'Day options' }).click()
  const options = page.getByRole('dialog', { name: 'Day' })
  await options.getByRole('switch', { name: 'Lunch' }).click()

  page.once('dialog', (dialog) => dialog.dismiss())
  await options.getByRole('button', { name: 'Close' }).click()
  await expect(options.getByRole('switch', { name: 'Lunch' })).toHaveAttribute(
    'aria-checked',
    'true',
  )

  page.once('dialog', (dialog) => dialog.accept())
  await options.getByRole('button', { name: 'Close' }).click()
  await expect(options).toBeHidden()
  const { data } = await backend.admin
    .from('meals')
    .select('meal_type')
    .eq('user_id', me.id)
    .eq('cheat_meal', true)
  expect(data).toEqual([])
})
