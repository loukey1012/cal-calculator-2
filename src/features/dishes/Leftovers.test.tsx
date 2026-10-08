import { screen } from '@testing-library/react'
import { useLocation } from 'react-router'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { renderWithProviders } from '../../test/render'
import { dayMeal } from '../meals/testData'

vi.mock('../weight/weightApi', () => ({
  fetchWeights: vi.fn().mockResolvedValue([]),
  saveWeight: vi.fn(),
  deleteWeight: vi.fn(),
}))
vi.mock('../meals/mealsApi', () => ({
  fetchDay: vi.fn(),
  addMealItem: vi.fn(),
  updateMealItem: vi.fn(),
  deleteMealItem: vi.fn(),
}))
vi.mock('../goals/goalsApi', () => ({ fetchGoals: vi.fn(), saveGoal: vi.fn() }))
vi.mock('../household/householdApi', () => ({ fetchMembers: vi.fn() }))
vi.mock('../ingredients/ingredientsApi', () => ({
  fetchIngredients: vi.fn().mockResolvedValue([]),
  fetchCategories: vi.fn().mockResolvedValue([]),
}))
vi.mock('./dishesApi', () => ({
  fetchDish: vi.fn(),
  saveDish: vi.fn(),
  deleteDish: vi.fn(),
  fetchLeftoverDishes: vi.fn(),
}))

import { fetchGoals } from '../goals/goalsApi'
import { fetchMembers } from '../household/householdApi'
import { fetchDay } from '../meals/mealsApi'
import { TodayPage } from '../today/TodayPage'
import { fetchLeftoverDishes } from './dishesApi'
import type { Dish } from './portions'
import { gramsItem } from './testData'

const PROFILE = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  appearance: {},
  created_at: '',
  updated_at: '',
}
const CHILI: Dish = {
  id: 'dish-1',
  name: 'Chili',
  splitMode: 'equal',
  cookedWeightG: null,
  revision: 'rev-1',
  portions: [
    {
      id: 'p-me',
      eater: { userId: 'u1', date: '2026-09-30', mealType: 'dinner' },
      splitValue: null,
    },
    { id: 'p-rest', eater: null, splitValue: null },
  ],
  lines: [{ id: 'l-mince', allocation: 'shared', item: gramsItem('Mince', 400, 250), amounts: {} }],
}

function LocationProbe() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

function renderToday() {
  renderWithProviders(
    <CurrentUserContext value={{ profile: PROFILE, householdId: 'h1' }}>
      <TodayPage />
      <LocationProbe />
    </CurrentUserContext>,
    { route: '/today' },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 1, 12, 0, 0))
  vi.mocked(fetchDay).mockResolvedValue([dayMeal('m1', 'lunch', [])])
  vi.mocked(fetchGoals).mockResolvedValue([])
  vi.mocked(fetchMembers).mockResolvedValue([PROFILE])
  vi.mocked(fetchLeftoverDishes).mockResolvedValue([CHILI])
})

afterEach(() => {
  vi.useRealTimers()
})

describe('leftovers on Today', () => {
  test('shows that food is left and opens Cook, where leftovers are eaten', async () => {
    const user = userEvent.setup()
    renderToday()

    await user.click(await screen.findByRole('button', { name: /Chili left/ }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent('/cook')
  })

  test('nothing shows without leftovers', async () => {
    vi.mocked(fetchLeftoverDishes).mockResolvedValue([])
    renderToday()

    await screen.findByTestId('day-total')
    expect(screen.queryByRole('button', { name: /left/ })).not.toBeInTheDocument()
  })
})
