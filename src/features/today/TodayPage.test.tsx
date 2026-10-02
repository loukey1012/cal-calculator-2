import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { ApiError } from '../../lib/errors'
import { renderWithProviders } from '../../test/render'
import { dayMeal, mealItem } from '../meals/testData'

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

import { addMealItem, fetchDay } from '../meals/mealsApi'
import { TodayPage } from './TodayPage'

const PROFILE = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  created_at: '',
  updated_at: '',
}

const LUNCH = dayMeal('m1', 'lunch', [
  mealItem({
    id: 'a',
    name: 'Cream',
    entered_amount: 150,
    basis_multiplier: 1.5,
    kcal: 92,
    protein: 1.3,
  }),
  mealItem({
    id: 'b',
    name: 'Croissant',
    entered_unit: 'unit',
    entered_amount: 2,
    basis: 'per_unit',
    basis_multiplier: 2,
    kcal: 200,
  }),
])

function renderPage() {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: PROFILE, householdId: 'h1' }}>
      <TodayPage />
    </CurrentUserContext>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 1, 12, 0, 0))
  vi.mocked(fetchDay).mockResolvedValue([LUNCH])
})

afterEach(() => {
  vi.useRealTimers()
})

describe('TodayPage', () => {
  test('loads today’s meals for the signed-in user', async () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
    expect(screen.getByText(/Thursday/)).toHaveTextContent(/October/)
    await waitFor(() => expect(screen.getByTestId('day-total')).toHaveTextContent('538 kcal'))
    expect(fetchDay).toHaveBeenCalledWith('u1', '2026-10-01')
  })

  test('shows each meal with its calories and the day total', async () => {
    renderPage()

    const lunch = screen.getByRole('button', { name: /Lunch/ })
    await waitFor(() => expect(lunch).toHaveTextContent('2 items'))
    expect(lunch).toHaveTextContent('538 kcal')
    expect(screen.getByRole('button', { name: /Breakfast/ })).toHaveTextContent('Nothing logged')
    expect(screen.getByTestId('day-total')).toHaveTextContent('538 kcal')
  })

  test('shows that the day is still loading instead of an empty day', () => {
    vi.mocked(fetchDay).mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByRole('button', { name: /Lunch/ })).toHaveTextContent('Loading…')
    expect(screen.queryByText('Nothing logged')).not.toBeInTheDocument()
  })

  test('tapping a meal opens it', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /Lunch/ }))

    const sheet = within(screen.getByRole('dialog', { name: 'Lunch' }))
    expect(sheet.getByText('Croissant')).toBeInTheDocument()
  })

  test('a save that fails after the sheet was closed is still reported', async () => {
    let failAdd = (_error: Error) => {}
    vi.mocked(addMealItem).mockReturnValue(
      new Promise<void>((_resolve, reject) => (failAdd = reject)),
    )
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /Lunch/ }))
    const sheet = within(screen.getByRole('dialog', { name: 'Lunch' }))
    await user.click(sheet.getByRole('button', { name: 'Add food' }))
    await user.click(sheet.getByRole('button', { name: /Custom item/ }))
    await user.type(sheet.getByLabelText('Name'), 'Apple')
    await user.type(sheet.getByLabelText('Calories'), '52')
    await user.type(sheet.getByLabelText('Amount'), '150')
    await user.click(sheet.getByRole('button', { name: 'Add to Lunch' }))
    await user.click(sheet.getByRole('button', { name: 'Close' }))
    act(() =>
      failAdd(new ApiError('new row for relation "meal_items" violates check constraint', '23514')),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Some values aren’t allowed.')
  })

  test('the open meal closes when the day rolls over at midnight', async () => {
    vi.useRealTimers()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 9, 1, 23, 59, 50))
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage()

    await user.click(await screen.findByRole('button', { name: /Lunch/ }))
    expect(screen.getByRole('dialog', { name: 'Lunch' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(15_000))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText(/Friday/)).toBeInTheDocument()
  })

  test('shows a retryable error when the day cannot be loaded', async () => {
    vi.mocked(fetchDay).mockRejectedValueOnce(new TypeError('Load failed'))
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('No connection.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Lunch/ })).toHaveTextContent('538 kcal'),
    )
  })
})
