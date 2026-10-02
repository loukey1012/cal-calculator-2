import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useLocation } from 'react-router'
import { renderWithProviders } from '../test/render'
import { CurrentUserContext } from './currentUser'

vi.mock('../features/household/householdApi', () => ({
  fetchHousehold: vi.fn().mockResolvedValue({
    id: 'h1',
    name: 'Home',
    invite_code: '4Y5RFXKYMJ4P',
    created_at: '',
  }),
  fetchMembers: vi.fn().mockResolvedValue([]),
}))
vi.mock('../features/ingredients/ingredientsApi', () => ({
  fetchIngredients: vi.fn().mockResolvedValue([]),
  fetchCategories: vi.fn().mockResolvedValue([]),
}))
vi.mock('../features/meals/mealsApi', () => ({
  fetchDay: vi.fn().mockResolvedValue([]),
}))
vi.mock('../features/goals/goalsApi', () => ({
  fetchGoals: vi.fn().mockResolvedValue([]),
}))
vi.mock('../features/history/historyApi', () => ({
  fetchDailyTotals: vi.fn().mockResolvedValue([]),
}))
vi.mock('../features/auth/authApi', () => ({ signOut: vi.fn() }))

import { TabShell } from './TabShell'

const PROFILE = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#ff2d55',
  created_at: '',
  updated_at: '',
}

function LocationProbe() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

function renderShell(route: string) {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: PROFILE, householdId: 'h1' }}>
      <TabShell />
      <LocationProbe />
    </CurrentUserContext>,
    { route },
  )
}

const tabs = () => within(screen.getByRole('navigation', { name: 'Tabs' }))
const visibleTitle = () => screen.getByRole('heading', { level: 1 })

beforeEach(() => {
  Element.prototype.scrollTo = vi.fn()
})

afterEach(() => {
  document.documentElement.style.removeProperty('--accent')
})

describe('TabShell', () => {
  test.each([
    ['/today', 'Today'],
    ['/history', 'History'],
    ['/ingredients', 'Ingredients'],
    ['/settings', 'Settings'],
  ])('%s shows only the %s page to assistive tech', async (route, title) => {
    renderShell(route)

    expect(visibleTitle()).toHaveTextContent(title)
    expect(tabs().getByRole('button', { name: title })).toHaveAttribute('aria-current', 'page')
  })

  test.each(['/', '/unknown'])('%s redirects to Today', (route) => {
    renderShell(route)

    expect(screen.getByTestId('path')).toHaveTextContent('/today')
    expect(visibleTitle()).toHaveTextContent('Today')
  })

  test('tapping a tab switches page and URL', async () => {
    const user = userEvent.setup()
    renderShell('/today')

    await user.click(tabs().getByRole('button', { name: 'Ingredients' }))

    expect(screen.getByTestId('path')).toHaveTextContent('/ingredients')
    expect(visibleTitle()).toHaveTextContent('Ingredients')
  })

  test('tapping the active tab scrolls its page back to the top', async () => {
    const user = userEvent.setup()
    renderShell('/history')

    await user.click(tabs().getByRole('button', { name: 'History' }))

    expect(Element.prototype.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  test('applies the user’s accent color', () => {
    renderShell('/today')

    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#ff2d55')
  })

  test('inactive pages are inert so focus cannot wander off-screen', () => {
    renderShell('/today')

    const pages = screen.getAllByTestId('tab-page')
    expect(pages.filter((page) => !page.hasAttribute('inert'))).toHaveLength(1)
  })
})
