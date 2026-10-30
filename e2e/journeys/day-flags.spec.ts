import { activePage, expect, localDay, logIn, test } from './backend.ts'

const flags = (page: ReturnType<typeof activePage>) =>
  page.getByRole('group', { name: /^Day flags/ })
const flag = (page: ReturnType<typeof activePage>, name: string) =>
  flags(page).getByRole('button', { name, exact: true })

// a popup button: its name lists the marked whole day and meals
const cheatButton = (page: ReturnType<typeof activePage>) =>
  flags(page).getByRole('button', { name: /^Cheat/ })

test('the Gym button saves at once and a second tap takes it back', async ({ page, backend }) => {
  const me = await backend.user('Gina')
  await backend.household([me])
  await logIn(page, me)
  const today = activePage(page)
  const gymRows = async () => {
    const { data } = await backend.admin
      .from('gym_days')
      .select('user_id, date')
      .eq('user_id', me.id)
    return data
  }

  await flag(today, 'Gym').click()
  await expect(flag(today, 'Gym')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(gymRows).toEqual([{ user_id: me.id, date: localDay() }])
  await expect(page.getByRole('status')).toHaveCount(0)

  await flag(today, 'Gym').click()
  await expect(flag(today, 'Gym')).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(gymRows).toEqual([])
})

test('Cheat whole day and Alcohol replace each other', async ({ page, backend }) => {
  const me = await backend.user('Cora')
  await backend.household([me])
  await logIn(page, me)
  const today = activePage(page)
  const marks = async () => {
    const { data } = await backend.admin
      .from('cheat_days')
      .select('date, kind')
      .eq('user_id', me.id)
    return data
  }

  await cheatButton(today).click()
  const popover = page.getByRole('dialog', { name: 'Cheat' })
  await popover.getByRole('button', { name: 'Whole day' }).click()
  await expect(popover.getByRole('button', { name: 'Whole day' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect.poll(marks).toEqual([{ date: localDay(), kind: 'cheat' }])
  await page.keyboard.press('Escape')
  await expect(popover).toBeHidden()
  await expect(cheatButton(today)).toHaveAccessibleName('Cheat: whole day')

  await flag(today, 'Alcohol').click()
  await expect(flag(today, 'Alcohol')).toHaveAttribute('aria-pressed', 'true')
  await expect(cheatButton(today)).toHaveAccessibleName('Cheat')
  await expect.poll(marks).toEqual([{ date: localDay(), kind: 'alcohol' }])

  await cheatButton(today).click()
  await popover.getByRole('button', { name: 'Whole day' }).click()
  await expect.poll(marks).toEqual([{ date: localDay(), kind: 'cheat' }])
  await expect(flag(today, 'Alcohol')).toHaveAttribute('aria-pressed', 'false')
})

test('the Cheat popover marks several meals and stays open', async ({ page, backend }) => {
  const me = await backend.user('Mona')
  await backend.household([me])
  await logIn(page, me)
  const today = activePage(page)
  const cheatMeals = async () => {
    const { data } = await backend.admin
      .from('meals')
      .select('meal_type')
      .eq('user_id', me.id)
      .eq('date', localDay())
      .eq('cheat_meal', true)
    return (data ?? []).map((row) => row.meal_type).sort()
  }

  await cheatButton(today).click()
  const popover = page.getByRole('dialog', { name: 'Cheat' })
  await popover.getByRole('button', { name: 'Lunch' }).click()
  await expect(popover.getByRole('button', { name: 'Lunch' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await popover.getByRole('button', { name: 'Dinner' }).click()
  await expect(popover.getByRole('button', { name: 'Dinner' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(popover).toBeVisible()
  await expect.poll(cheatMeals).toEqual(['dinner', 'lunch'])

  await page.keyboard.press('Escape')
  await expect(popover).toBeHidden()
  await expect(cheatButton(today)).toHaveAccessibleName('Cheat: Lunch, Dinner')
})

test("on the partner's day the Gym button sets the partner's flag", async ({ page, backend }) => {
  const me = await backend.user('Lukas')
  const partner = await backend.user('Lisa')
  await backend.household([me, partner])
  await logIn(page, me)
  const today = activePage(page)
  await today
    .getByRole('radiogroup', { name: 'Person' })
    .getByRole('radio', { checked: false })
    .click()

  await flag(today, 'Gym').click()
  await expect(flag(today, 'Gym')).toHaveAttribute('aria-pressed', 'true')
  await expect
    .poll(async () => {
      const { data } = await backend.admin
        .from('gym_days')
        .select('user_id, date')
        .in('user_id', [me.id, partner.id])
      return data
    })
    .toEqual([{ user_id: partner.id, date: localDay() }])
})
