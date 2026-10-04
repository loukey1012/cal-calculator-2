import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { renderWithProviders } from '../../test/render'
import { dayMeal, mealItem } from '../meals/testData'

vi.mock('./historyApi', () => ({ fetchDailyTotals: vi.fn() }))
vi.mock('../goals/goalsApi', () => ({ fetchGoals: vi.fn(), saveGoal: vi.fn() }))
vi.mock('../household/householdApi', () => ({ fetchMembers: vi.fn() }))
vi.mock('../meals/mealsApi', () => ({
  fetchDay: vi.fn(),
  addMealItem: vi.fn(),
  updateMealItem: vi.fn(),
  deleteMealItem: vi.fn(),
}))
vi.mock('../ingredients/ingredientsApi', () => ({
  fetchIngredients: vi.fn().mockResolvedValue([]),
  fetchCategories: vi.fn().mockResolvedValue([]),
}))

import { fetchGoals } from '../goals/goalsApi'
import { fetchMembers } from '../household/householdApi'
import { addMealItem, fetchDay } from '../meals/mealsApi'
import { fetchDailyTotals } from './historyApi'
import { HistoryPage } from './HistoryPage'

const PROFILE = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  appearance: {},
  created_at: '',
  updated_at: '',
}
const PARTNER = { ...PROFILE, id: 'u2', display_name: 'Anna' }
const GOAL = { validFrom: '2026-09-01', kcal: 2000, proteinG: null, carbsG: null, fatG: null }

function LocationProbe() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

function renderPage(route = '/history') {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: PROFILE, householdId: 'h1' }}>
      <HistoryPage />
      <LocationProbe />
    </CurrentUserContext>,
    { route },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 15, 12, 0))
  vi.mocked(fetchDailyTotals).mockResolvedValue([
    { date: '2026-10-01', kcal: 1850, protein: 100, mealCount: 3 },
    { date: '2026-10-02', kcal: 2350, protein: 60, mealCount: 2 },
  ])
  vi.mocked(fetchGoals).mockResolvedValue([GOAL])
  vi.mocked(fetchMembers).mockResolvedValue([PROFILE])
  vi.mocked(fetchDay).mockResolvedValue([
    dayMeal('m1', 'lunch', [mealItem({ id: 'a', name: 'Pasta', kcal: 350, basis_multiplier: 2 })]),
  ])
  vi.mocked(addMealItem).mockResolvedValue()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('HistoryPage', () => {
  test('shows this month with each logged day judged against its goal', async () => {
    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /October 1.*within goal/ })).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /October 2.*over goal/ })).toBeInTheDocument()
    expect(fetchDailyTotals).toHaveBeenCalledWith('u1', '2026-10-01', '2026-10-31')
  })

  test('summarises the logged days of the month', async () => {
    renderPage()

    const summary = await screen.findByTestId('month-summary')
    await waitFor(() => expect(summary).toHaveTextContent('2 days logged'))
    expect(summary).toHaveTextContent('Ø 2,100 kcal')
    expect(summary).toHaveTextContent('Ø 80.0 g protein')
  })

  test('a tapped day opens beneath the calendar and can be edited like today', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(screen.getByText('Tap a day to see what was eaten.')).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: /October 1.*within goal/ }))

    expect(screen.getByTestId('path')).toHaveTextContent('/history/2026-10-01')
    // still the History page with its calendar, the day just below it
    expect(screen.getByRole('heading', { level: 1, name: 'History' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'October 2026' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /October 1.*within goal/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const day = screen.getByRole('region', { name: /October 1/ })
    await waitFor(() => expect(fetchDay).toHaveBeenCalledWith('u1', '2026-10-01'))
    expect(within(day).getByTestId('day-total')).toBeInTheDocument()

    // add the forgotten dinner to that day
    await user.click(screen.getByRole('button', { name: /Dinner/ }))
    const sheet = within(screen.getByRole('dialog', { name: 'Dinner' }))
    await user.click(sheet.getByRole('button', { name: 'Add food' }))
    await user.click(sheet.getByRole('button', { name: /Custom item/ }))
    await user.type(sheet.getByLabelText('Name'), 'Soup')
    await user.type(sheet.getByLabelText('Calories'), '80')
    await user.type(sheet.getByLabelText('Amount'), '300')
    await user.click(sheet.getByRole('button', { name: 'Add to Dinner' }))

    await waitFor(() =>
      expect(addMealItem).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', date: '2026-10-01', mealType: 'dinner' }),
      ),
    )
  })

  test('the protein average is left out when nothing logged had protein data', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([
      { date: '2026-10-01', kcal: 1850, protein: 0, mealCount: 1 },
    ])
    renderPage()

    const summary = await screen.findByTestId('month-summary')
    await waitFor(() => expect(summary).toHaveTextContent('1 day logged · Ø 1,850 kcal'))
    expect(summary).not.toHaveTextContent('protein')
  })

  test('tapping another day switches the details; tapping the open day closes them', async () => {
    const user = userEvent.setup()
    renderPage('/history/2026-10-02')
    expect(screen.getByRole('region', { name: /October 2/ })).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: /October 1.*within goal/ }))
    expect(screen.getByRole('region', { name: /October 1/ })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /October 2/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /October 1.*within goal/ }))
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/history$/)
    expect(screen.queryByRole('region', { name: /October/ })).not.toBeInTheDocument()
  })

  test('a day in an earlier month opens that month', () => {
    renderPage('/history/2026-09-10')

    expect(screen.getByRole('heading', { level: 2, name: 'September 2026' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /September 10/ })).toBeInTheDocument()
  })

  test('an invalid or future date in the address shows the calendar instead', () => {
    renderPage('/history/2026-12-24')

    expect(screen.getByRole('heading', { level: 1, name: 'History' })).toBeInTheDocument()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  test('shows the partner’s history after switching person', async () => {
    vi.mocked(fetchMembers).mockResolvedValue([PROFILE, PARTNER])
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('radio', { name: 'Anna' }))

    await waitFor(() =>
      expect(fetchDailyTotals).toHaveBeenCalledWith('u2', '2026-10-01', '2026-10-31'),
    )
  })
})
