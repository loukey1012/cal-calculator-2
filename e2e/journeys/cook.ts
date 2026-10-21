import type { Locator, Page } from '@playwright/test'
import { activePage, expect } from './backend.ts'

/** Adds an ingredient from the database to the dish on Add food. */
export async function addIngredient(page: Page, name: RegExp | string, amount: string) {
  const cook = activePage(page)
  await cook.getByRole('button', { name: 'Add ingredient' }).click()
  await cook
    .getByRole('button', { name: typeof name === 'string' ? new RegExp(name) : name })
    .click()
  await cook.getByLabel('Amount').fill(amount)
  await cook.getByRole('button', { name: 'Add to dish' }).click()
}

/** Opens an empty meal on the shown day, then its Add food. */
export async function cookFor(day: Locator, page: Page, meal: RegExp) {
  const card = day.getByRole('button', { name: meal })
  await expect(card).toContainText('Nothing logged')
  await card.click()
  await activePage(page).getByRole('button', { name: '+ Add food' }).click()
  await activePage(page).getByRole('heading', { level: 1, name: 'Add food' }).waitFor()
}

// back from a meal's pages to Today, one page at a time
const MAX_DEPTH = 6

/** Opens Add food of a meal of today (empty or not), from Today. */
export async function openAddFood(page: Page, meal: RegExp = /Snacks/) {
  await page
    .getByRole('navigation', { name: 'Tabs' })
    .getByRole('button', { name: 'Today' })
    .click()
  for (let depth = 0; depth < MAX_DEPTH && !page.url().endsWith('/today'); depth++) {
    await activePage(page).getByRole('button', { name: 'Back' }).first().click()
  }
  await expect(page).toHaveURL(/\/today$/)
  const card = activePage(page).getByRole('button', { name: meal })
  await expect(card).not.toContainText(/Loading|not loaded/)
  await card.click()
  await activePage(page)
    .getByRole('button', { name: /Add food|Continue/ })
    .click()
  await activePage(page).getByRole('heading', { level: 1, name: 'Add food' }).waitFor()
}

/** From a meal's page (where saving leads) back to the day below it. */
export async function backToDay(page: Page) {
  await activePage(page).getByRole('button', { name: 'Back' }).first().click()
}

/** Opens a meal's Add from recipe, from Today. */
export async function addFromRecipe(page: Page, meal: RegExp = /Snacks/) {
  await openAddFood(page, meal)
  await activePage(page).getByRole('button', { name: 'Back' }).click()
  await activePage(page).getByRole('button', { name: 'Add from recipe' }).click()
}
