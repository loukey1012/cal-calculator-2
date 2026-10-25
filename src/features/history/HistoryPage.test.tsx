import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation, useNavigate } from 'react-router'
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
  fetchCheatDay: vi.fn().mockResolvedValue(false),
  fetchDayNote: vi.fn().mockResolvedValue(null),
  setCheatMeal: vi.fn(),
  setCheatDay: vi.fn(),
}))
vi.mock('../ingredients/ingredientsApi', () => ({
  fetchIngredients: vi.fn().mockResolvedValue([]),
  fetchCategories: vi.fn().mockResolvedValue([]),
}))

import { fetchGoals } from '../goals/goalsApi'
import { fetchMembers } from '../household/householdApi'
import { addMealItem, fetchDay } from '../meals/mealsApi'
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

/** a day with lunch and dinner logged */
function complete(date: string) {
  return {
    date,
    kcal: 1800,
    protein: 0,
    mealCount: 3,
    kcalEstimated: false,
    lunchLogged: true,
    dinnerLogged: true,
  }
}
const GOAL = {
  validFrom: '2026-09-01',
  kcal: 2000,
  proteinG: null,
  carbsG: null,
  fatG: null,
  fiberG: null,
  weightGoalKg: null,
}

function LocationProbe() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

/** Like the review's Open day: elsewhere in the app, while History stays mounted. */
function OpenPartnersDay() {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate('/history/2026-09-10', { state: { person: 'u2' } })}
    >
      Open partner’s day
    </button>
  )
}

function renderPage(route = '/history') {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: PROFILE, householdId: 'h1' }}>
      <AddFoodSession>
        <HistoryPage />
      </AddFoodSession>
      <LocationProbe />
      <OpenPartnersDay />
    </CurrentUserContext>,
    { route },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 15, 12, 0))
  vi.mocked(fetchDailyTotals).mockResolvedValue([
    { date: '2026-10-01', kcal: 1850, protein: 100, mealCount: 3, kcalEstimated: false },
    { date: '2026-10-02', kcal: 2350, protein: 60, mealCount: 2, kcalEstimated: false },
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
    // the weight that applied that day, below the meals
    expect(await within(day).findByRole('button', { name: /Weight/ })).toHaveTextContent('72.4 kg')

    // the forgotten dinner is added on its own page, on top of this day
    await user.click(screen.getByRole('button', { name: /Dinner/ }))
    expect(screen.getByTestId('path').textContent).toBe(
      '/history/2026-10-01/meal-dinner-2026-10-01-u1',
    )
  })

  test('the protein average is left out when nothing logged had protein data', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([
      { date: '2026-10-01', kcal: 1850, protein: 0, mealCount: 1, kcalEstimated: false },
    ])
    renderPage()

    const summary = await screen.findByTestId('month-summary')
    await waitFor(() => expect(summary).toHaveTextContent('1 day logged · Ø 1,850 kcal'))
    expect(summary).not.toHaveTextContent('protein')
  })

  test('cheat days and days with a cheat meal are marked and left out of the average', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([
      { date: '2026-10-01', kcal: 1850, protein: 0, mealCount: 1, kcalEstimated: false },
      {
        date: '2026-10-02',
        kcal: 4000,
        protein: 0,
        mealCount: 3,
        kcalEstimated: false,
        cheatDay: true,
      },
      {
        date: '2026-10-03',
        kcal: 300,
        protein: 0,
        mealCount: 1,
        kcalEstimated: false,
        cheatMeal: true,
      },
    ])
    renderPage()

    const summary = await screen.findByTestId('month-summary')
    await waitFor(() =>
      expect(summary).toHaveTextContent('1 day logged · Ø 1,850 kcal · 2 days left out'),
    )
    expect(screen.getByRole('button', { name: /October 2.*cheat day/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /October 3.*cheat meal/ })).toBeInTheDocument()
  })

  test('days since tracking started without lunch or dinner are flagged and left out', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([
      { ...complete('2026-10-01'), kcal: 1800 },
      { ...complete('2026-10-11'), kcal: 900, dinnerLogged: false },
      // today: dinner isn't eaten yet, so it's neither flagged nor counted
      { ...complete('2026-10-15'), kcal: 500, dinnerLogged: false },
    ])
    renderPage()

    const summary = await screen.findByTestId('month-summary')
    await waitFor(() =>
      expect(summary).toHaveTextContent('1 day logged · Ø 1,800 kcal · 1 day left out'),
    )
    expect(
      screen.getByRole('button', { name: /October 11.*lunch or dinner missing/ }),
    ).toBeVisible()
    // nothing logged at all since tracking started is flagged too, earlier days aren't
    expect(
      screen.getByRole('button', { name: /October 12.*lunch or dinner missing/ }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'October 9' })).toBeVisible()
    expect(screen.getByRole('button', { name: /Today, October 15/ })).not.toHaveAccessibleName(
      /missing/,
    )
  })

  test('an opened past day says which main meal is missing', async () => {
    vi.mocked(fetchDay).mockResolvedValue([dayMeal('m1', 'lunch', [mealItem({ id: 'soup' })])])
    renderPage('/history/2026-10-12')

    const day = screen.getByRole('region', { name: /October 12/ })
    await waitFor(() =>
      expect(within(day).getByTestId('day-total')).toHaveTextContent('Dinner missing'),
    )
  })

  test('the average is marked as approximate when a day had estimated calories', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([
      { date: '2026-10-01', kcal: 1850, protein: 0, mealCount: 1, kcalEstimated: true },
    ])
    renderPage()

    const summary = await screen.findByTestId('month-summary')
    await waitFor(() => expect(summary).toHaveTextContent('1 day logged · Ø ~1,850 kcal'))
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

    await user.click(await screen.findByRole('radio', { name: 'baby' }))

    await waitFor(() =>
      expect(fetchDailyTotals).toHaveBeenCalledWith('u2', '2026-10-01', '2026-10-31'),
    )
  })

  test('opened for someone’s day from elsewhere, shows that person, month and day', async () => {
    vi.mocked(fetchMembers).mockResolvedValue([PROFILE, PARTNER])
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('radio', { name: 'baby' })

    await user.click(screen.getByRole('button', { name: 'Open partner’s day' }))

    expect(screen.getByRole('radio', { name: 'baby' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('heading', { level: 2, name: 'September 2026' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /September 10/ })).toBeInTheDocument()
    await waitFor(() =>
      expect(fetchDailyTotals).toHaveBeenCalledWith('u2', '2026-09-01', '2026-09-30'),
    )
  })

  test('opened fresh for someone’s day also shows that person', async () => {
    vi.mocked(fetchMembers).mockResolvedValue([PROFILE, PARTNER])
    renderWithProviders(
      <CurrentUserContext value={{ profile: PROFILE, householdId: 'h1' }}>
        <AddFoodSession>
          <HistoryPage />
        </AddFoodSession>
      </CurrentUserContext>,
      { route: '/history/2026-09-10', state: { person: 'u2' } },
    )

    expect(await screen.findByRole('radio', { name: 'baby' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await waitFor(() =>
      expect(fetchDailyTotals).toHaveBeenCalledWith('u2', '2026-09-01', '2026-09-30'),
    )
  })
})
