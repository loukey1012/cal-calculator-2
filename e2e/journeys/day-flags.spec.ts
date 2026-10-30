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

test('holding a calendar day opens a quick look that stays open and sets the flags', async ({
  page,
  backend,
}) => {
  const me = await backend.user('Hana')
  await backend.household([me])
  await logIn(page, me)
  // a past day of the current month; on the 1st there is none, so today itself serves
  const date = new Date().getDate() > 1 ? localDay(1) : localDay()
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'History' })
    .click()
  const history = activePage(page)
  const cell = history.locator(`button[data-date="${date}"]`)
  const longDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
  const quickLook = page.getByRole('dialog', { name: longDate })
  const cheatList = page.getByRole('dialog', { name: 'Cheat', exact: true })
  const gymRows = async () => {
    const { data } = await backend.admin
      .from('gym_days')
      .select('user_id, date')
      .eq('user_id', me.id)
    return data
  }
  const cheatRows = async () => {
    const { data } = await backend.admin
      .from('cheat_days')
      .select('date, kind')
      .eq('user_id', me.id)
    return data
  }
  const inLook = (name: string) =>
    quickLook.getByRole('group', { name: /^Day flags/ }).getByRole('button', { name, exact: true })

  await cell.hover()
  await page.mouse.down()
  await expect(quickLook).toBeVisible({ timeout: 3_000 })
  await page.mouse.up()
  // the click that follows the release is swallowed for a moment
  await expect(quickLook).toBeVisible()

  // retry until the swallowed window has passed
  await expect(async () => {
    await inLook('Gym').click()
    await expect(cell.getByTestId('gym-mark')).toBeVisible({ timeout: 700 })
  }).toPass()
  await expect(inLook('Gym')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(gymRows).toEqual([{ user_id: me.id, date }])
  await inLook('Gym').click()
  await expect(cell.getByTestId('gym-mark')).toHaveCount(0)
  await expect.poll(gymRows).toEqual([])

  await inLook('Alcohol').click()
  await expect(cell).toHaveAttribute('data-status', 'alcoholDay')
  await expect.poll(cheatRows).toEqual([{ date, kind: 'alcohol' }])

  await quickLook.getByRole('button', { name: /^Cheat/ }).click()
  await cheatList.getByRole('button', { name: 'Whole day' }).click()
  await expect.poll(cheatRows).toEqual([{ date, kind: 'cheat' }])
  await expect(cell).toHaveAttribute('data-status', 'cheatDay')
  // a tap inside the list keeps the card open
  await expect(quickLook).toBeVisible()
  await expect(cheatList).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(cheatList).toBeHidden()
  await expect(quickLook).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(quickLook).toBeHidden()
})
