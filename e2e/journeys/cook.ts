import type { Locator, Page } from '@playwright/test'
import { activePage, expect } from './backend.ts'

/** Adds an ingredient from the database to the dish on the Cook tab. */
export async function addIngredient(page: Page, name: RegExp | string, amount: string) {
  const cook = activePage(page)
  await cook.getByRole('button', { name: 'Add ingredient' }).click()
  await cook
    .getByRole('button', { name: typeof name === 'string' ? new RegExp(name) : name })
    .click()
  await cook.getByLabel('Amount').fill(amount)
  await cook.getByRole('button', { name: 'Add to dish' }).click()
}

/** Opens an empty meal on the shown day, which opens Cook for it. */
export async function cookFor(day: Locator, page: Page, meal: RegExp) {
  const card = day.getByRole('button', { name: meal })
  // once loaded, an empty meal goes straight to Cook
  await expect(card).toContainText('Nothing logged')
  await card.click()
  await activePage(page).getByRole('heading', { level: 1, name: 'Cook' }).waitFor()
}
