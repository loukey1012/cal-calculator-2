import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { renderWithProviders } from '../../test/render'
import { dayMeal, mealItem } from '../meals/testData'

vi.mock('../dishes/dishesApi', () => ({
  fetchLeftoverDishes: vi.fn().mockResolvedValue([]),
  fetchDish: vi.fn(),
  saveDish: vi.fn(),
  deleteDish: vi.fn(),
}))
vi.mock('./historyApi', () => ({ fetchDailyTotals: vi.fn() }))
vi.mock('../weight/weightApi', () => ({
  fetchWeights: vi.fn().mockResolvedValue([{ date: '2026-09-28', weightKg: 72.4 }]),
  saveWeight: vi.fn(),
  deleteWeight: vi.fn(),
}))
// Add food (opened from an empty meal) loads the recipes and notes a started dish
vi.mock('../recipes/recipesApi', () => ({
  fetchRecipes: vi.fn().mockResolvedValue([]),
  saveRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
}))
vi.mock('../addFood/draftNotice', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../addFood/draftNotice')>()),
  sendDraftNotice: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../goals/goalsApi', () => ({ fetchGoals: vi.fn(), saveGoal: vi.fn() }))
vi.mock('../household/householdApi', () => ({ fetchMembers: vi.fn() }))
vi.mock('../meals/mealsApi', () => ({
  fetchDay: vi.fn(),
  addMealItem: vi.fn(),
  updateMealItem: vi.fn(),
  deleteMealItem: vi.fn(),
  fetchDayMark: vi.fn().mockResolvedValue(null),
  fetchDayNote: vi.fn().mockResolvedValue(null),
  setCheatMeal: vi.fn(),
  setDayMark: vi.fn(),
}))
vi.mock('../ingredients/ingredientsApi', () => ({
  fetchIngredients: vi.fn().mockResolvedValue([]),
  fetchCategories: vi.fn().mockResolvedValue([]),
}))

import { fetchGoals } from '../goals/goalsApi'
import { fetchMembers } from '../household/householdApi'
import { fetchDay } from '../meals/mealsApi'
import { fetchDailyTotals } from './historyApi'
import { AddFoodSession } from '../addFood/AddFoodSession'
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
const PARTNER = { ...PROFILE, id: 'u2', display_name: 'baby' }

const GOAL = {
  validFrom: '2026-09-01',
  kcal: 2000,
  proteinG: null,
  carbsG: null,
  fatG: null,
  fiberG: null,
  weightGoalKg: null,
}

/** Like the page stack: a new path is a new page, so History mounts again. */
function RemountByPath() {
  const { pathname } = useLocation()
  return (
    <AddFoodSession>
      <HistoryPage key={pathname} />
    </AddFoodSession>
  )
}

function renderPage() {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: PROFILE, householdId: 'h1' }}>
      <RemountByPath />
    </CurrentUserContext>,
    { route: '/history' },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 15, 12, 0))
  vi.mocked(fetchDailyTotals).mockResolvedValue([
    { date: '2026-10-01', kcal: 1850, protein: 100, mealCount: 3, kcalEstimated: false },
  ])
  vi.mocked(fetchGoals).mockResolvedValue([GOAL])
  vi.mocked(fetchMembers).mockResolvedValue([PROFILE, PARTNER])
  vi.mocked(fetchDay).mockResolvedValue([
    dayMeal('m1', 'lunch', [mealItem({ id: 'a', name: 'Pasta', kcal: 350 })]),
  ])
})

afterEach(() => {
  vi.useRealTimers()
})

describe('History keeps the picked person when the page remounts', () => {
  test('stays on the partner after tapping a day, and after closing it again', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('radio', { name: 'baby' }))
    await user.click(await screen.findByRole('button', { name: /October 1\b/ }))

    await waitFor(() => expect(fetchDay).toHaveBeenCalledWith('u2', '2026-10-01'))
    expect(screen.getByRole('radio', { name: 'baby' })).toHaveAttribute('aria-checked', 'true')

    await user.click(screen.getByRole('button', { name: /October 1\b/ }))

    expect(await screen.findByText('Tap a day to see what was eaten.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'baby' })).toHaveAttribute('aria-checked', 'true')
    expect(fetchDay).not.toHaveBeenCalledWith('u1', expect.anything())
  })

  test('keeps the month shown when the person is switched with a day open', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: /October 1\b/ }))
    await user.click(await screen.findByRole('button', { name: 'Previous month' }))
    expect(await screen.findByRole('heading', { name: /September 2026/ })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'baby' }))

    expect(await screen.findByRole('heading', { name: /September 2026/ })).toBeInTheDocument()
  })

  test('keeps the month shown when the open day is closed', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Previous month' }))
    await user.click(await screen.findByRole('button', { name: /September 20\b/ }))

    await user.click(await screen.findByRole('button', { name: /September 20\b/ }))

    expect(await screen.findByText('Tap a day to see what was eaten.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /September 2026/ })).toBeInTheDocument()
  })
})
