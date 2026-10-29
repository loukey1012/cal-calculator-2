import type { Page } from '@playwright/test'
import { activePage, expect, localDay, logIn, test } from './backend.ts'

/** Opens the History tab; the calendar starts on the current month. */
async function openHistory(page: Page) {
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'History' })
    .click()
  return activePage(page)
}

/** A calendar cell of the current month. */
const cellOf = (history: ReturnType<typeof activePage>, date: string) =>
  history.locator(`button[data-date="${date}"]`)

test('Sex shows on both calendars, Gym is set by the partner and found with the filter', async ({
  page,
  browser,
  backend,
}) => {
  const me = await backend.user('Lukas')
  const partner = await backend.user('Lisa')
  const householdId = await backend.household([me, partner])
  const today = localDay()

  // I mark today as a sex day in the day options; it is kept only on Save
  await logIn(page, me)
  const todayPage = activePage(page)
  await todayPage.getByRole('button', { name: 'Day options' }).click()
  const options = page.getByRole('dialog', { name: 'Day', exact: true })
  await expect(options.getByText('Neither changes any figure.')).toBeVisible()
  await options.getByRole('switch', { name: 'Sex' }).click()
  await expect(options.getByRole('switch', { name: 'Sex' })).toHaveAttribute('aria-checked', 'true')
  const sexRows = async () => {
    const { data } = await backend.admin
      .from('sex_days')
      .select('household_id, date')
      .eq('household_id', householdId)
    return data
  }
  expect(await sexRows()).toEqual([])
  await options.getByRole('button', { name: 'Save' }).click()
  await expect.poll(sexRows).toEqual([{ household_id: householdId, date: today }])
  await expect(todayPage.getByTestId('day-total')).toContainText('Sex')

  // the partner sees the heart on the same date in their own History, on another phone with the
  // same device settings as this one
  const partnerPhone = await browser.newContext(test.info().project.use)
  try {
    const partnerPage = await partnerPhone.newPage()
    await logIn(partnerPage, partner)
    const partnerHistory = await openHistory(partnerPage)
    await expect(cellOf(partnerHistory, today).getByTestId('sex-mark')).toBeVisible()
    await expect(cellOf(partnerHistory, today).getByTestId('gym-mark')).toHaveCount(0)

    // the partner sets my gym day: on Today they look at my day. My radio is the one that is not
    // selected, whatever they call me (the name is a nickname they may have changed)
    await partnerPage
      .getByRole('navigation', { name: 'Tabs' })
      .getByRole('button', { name: 'Today' })
      .click()
    const partnerToday = activePage(partnerPage)
    // the tab slides in: until then the History page still counts as the active one
    await expect(partnerToday.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible()
    await partnerToday
      .getByRole('radiogroup', { name: 'Person' })
      .getByRole('radio', { checked: false })
      .click()
    await partnerToday.getByRole('button', { name: 'Day options' }).click()
    const partnerOptions = partnerPage.getByRole('dialog', { name: 'Day', exact: true })
    await partnerOptions.getByRole('switch', { name: 'Gym' }).click()
    await partnerOptions.getByRole('button', { name: 'Save' }).click()
    const gymRows = async () => {
      const { data } = await backend.admin
        .from('gym_days')
        .select('user_id, date')
        .in('user_id', [me.id, partner.id])
      return data
    }
    await expect.poll(gymRows).toEqual([{ user_id: me.id, date: today }])
  } finally {
    await partnerPhone.close()
  }

  // on my calendar both marks show; the Gym filter fades the other days, not today
  const history = await openHistory(page)
  await expect(cellOf(history, today).getByTestId('gym-mark')).toBeVisible()
  await expect(cellOf(history, today).getByTestId('sex-mark')).toBeVisible()
  await history.getByRole('button', { name: 'Filter', exact: true }).click()
  await page
    .getByRole('dialog', { name: 'Highlight days' })
    .getByRole('button', { name: 'Gym' })
    .click()
  await expect(history.getByRole('button', { name: 'Filter: Gym' })).toBeVisible()
  // some day other than today fades (which one depends on today's place in the month)
  await expect(history.locator('button[data-date][data-faded="true"]').first()).toBeVisible()
  await expect(cellOf(history, today)).not.toHaveAttribute('data-faded', 'true')
})
