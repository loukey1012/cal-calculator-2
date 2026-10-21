import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { ApiError } from '../../lib/errors'
import { useLocation } from 'react-router'
import { renderWithProviders } from '../../test/render'
import { dayMeal, mealItem } from '../meals/testData'

vi.mock('../dishes/dishesApi', () => ({
  fetchLeftoverDishes: vi.fn().mockResolvedValue([]),
  fetchDish: vi.fn(),
  saveDish: vi.fn(),
  deleteDish: vi.fn(),
}))
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
// Add food (opened from an empty meal) loads the recipes and notes a started dish
vi.mock('../recipes/recipesApi', () => ({
  fetchRecipes: vi.fn().mockResolvedValue([]),
  saveRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
}))
vi.mock('../cook/draftNotice', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../cook/draftNotice')>()),
  sendDraftNotice: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../goals/goalsApi', () => ({ fetchGoals: vi.fn(), saveGoal: vi.fn() }))
vi.mock('../weight/weightApi', () => ({
  fetchWeights: vi.fn(),
  saveWeight: vi.fn(),
  deleteWeight: vi.fn(),
}))
vi.mock('../household/householdApi', () => ({ fetchMembers: vi.fn() }))
vi.mock('../ingredients/ingredientsApi', () => ({
  fetchIngredients: vi.fn().mockResolvedValue([]),
  fetchCategories: vi.fn().mockResolvedValue([]),
}))

import { fetchGoals } from '../goals/goalsApi'
import { fetchMembers } from '../household/householdApi'
import {
  fetchDay,
  fetchCheatDay,
  fetchDayNote,
  setCheatDay,
  updateMealItem,
} from '../meals/mealsApi'
import { fetchWeights, saveWeight } from '../weight/weightApi'
import { newCookDraft, withDish } from '../cook/cookDraft'
import { CookSession } from '../cook/CookSession'
import { saveCookDraft } from '../cook/draftStorage'
import { TodayPage } from './TodayPage'

const PROFILE = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  appearance: {},
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

const GOAL = {
  validFrom: '2026-09-01',
  kcal: 2000,
  proteinG: 120,
  carbsG: null,
  fatG: null,
  fiberG: null,
  weightGoalKg: null,
}
const PARTNER = { ...PROFILE, id: 'u2', display_name: 'baby' }

function LocationProbe() {
  const { pathname, search } = useLocation()
  return <output data-testid="location">{pathname + search}</output>
}

function renderPage() {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: PROFILE, householdId: 'h1' }}>
      <CookSession>
        <TodayPage />
      </CookSession>
      <LocationProbe />
    </CurrentUserContext>,
    { route: '/today' },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 1, 12, 0, 0))
  vi.mocked(fetchDay).mockResolvedValue([LUNCH])
  vi.mocked(fetchCheatDay).mockResolvedValue(false)
  vi.mocked(fetchGoals).mockResolvedValue([GOAL])
  vi.mocked(fetchMembers).mockResolvedValue([PROFILE])
  vi.mocked(fetchWeights).mockResolvedValue([{ date: '2026-09-28', weightKg: 72.4 }])
  vi.mocked(saveWeight).mockResolvedValue()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('TodayPage', () => {
  test('loads today’s meals for the signed-in user', async () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
    expect(screen.getByText(/Thursday/)).toHaveTextContent(/October/)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Lunch/ })).toHaveTextContent('538 kcal'),
    )
    expect(fetchDay).toHaveBeenCalledWith('u1', '2026-10-01')
  })

  test('shows each meal with its calories and the day total', async () => {
    renderPage()

    const lunch = screen.getByRole('button', { name: /Lunch/ })
    await waitFor(() => expect(lunch).toHaveTextContent('2 items'))
    expect(lunch).toHaveTextContent('538 kcal')
    expect(screen.getByRole('button', { name: /Breakfast/ })).toHaveTextContent('Nothing logged')
    // the day's total is on the goal card, not repeated under "Meals"
    expect(screen.getByTestId('day-total')).not.toHaveTextContent('kcal')
  })

  test('a cooked dish counts as one item, however many ingredients it has', async () => {
    const dishItem = (id: string, lineId: string) =>
      mealItem({ id, dish_portion_id: 'p1', dish_line_id: lineId, kcal: 100 })
    vi.mocked(fetchDay).mockResolvedValue([
      dayMeal('m1', 'lunch', [
        mealItem({ id: 'apple', kcal: 50 }),
        dishItem('x', 'l1'),
        dishItem('y', 'l2'),
        dishItem('z', 'l3'),
      ]),
    ])
    renderPage()

    const lunch = screen.getByRole('button', { name: /Lunch/ })
    await waitFor(() => expect(lunch).toHaveTextContent('2 items'))
    expect(lunch).toHaveTextContent('350 kcal')
  })

  test('a dish marked as an estimate makes its meal, the day and the goal approximate', async () => {
    // Arrange
    const pizza = mealItem({
      id: 'pizza',
      name: 'Pizza',
      dish_portion_id: 'p1',
      dish_line_id: 'l1',
      kcal: 900,
      dish: { id: 'd1', name: 'Pizza out', portionCount: 1, eaterCount: 1, kcalEstimated: true },
    })
    vi.mocked(fetchDay).mockResolvedValue([LUNCH, dayMeal('m2', 'dinner', [pizza])])
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    // Act
    renderPage()

    // Assert
    const dinner = screen.getByRole('button', { name: /Dinner/ })
    await waitFor(() => expect(dinner).toHaveTextContent('~900 kcal'))
    expect(screen.getByRole('button', { name: /Lunch/ })).toHaveTextContent(/^Lunch538 kcal/)
    const goals = await screen.findByRole('list', { name: 'Goals' })
    expect(goals).toHaveTextContent('~1,438 / 2,000 kcal')
    expect(goals).toHaveTextContent('~562')

    await user.click(dinner)
    expect(screen.getByTestId('meal-total')).toHaveTextContent('~900 kcal')
    expect(screen.getByRole('button', { name: /Pizza out/ })).toHaveTextContent(
      /Estimate · 1 ingredient.*~900 kcal/,
    )
  })

  test('a cheat day says so, and its rings show no over colors', async () => {
    // Arrange: 2,538 kcal against a goal of 2,000
    vi.mocked(fetchCheatDay).mockResolvedValue(true)
    vi.mocked(fetchDay).mockResolvedValue([
      LUNCH,
      dayMeal('m2', 'dinner', [mealItem({ id: 'cake', kcal: 2000 })]),
    ])

    // Act
    renderPage()

    // Assert
    const total = screen.getByTestId('day-total')
    await waitFor(() => expect(total).toHaveTextContent('Cheat day'))
    const goals = await screen.findByRole('list', { name: 'Goals' })
    const ring = within(goals).getAllByTestId('ring')[0]
    expect(ring?.querySelectorAll('circle')[1]?.style.stroke).toBe('var(--goal-kcal)')
  })

  test('a cheat meal: its card and the day say so, its food counts, no over colors', async () => {
    vi.mocked(fetchDay).mockResolvedValue([
      LUNCH,
      { ...dayMeal('m2', 'dinner', [mealItem({ id: 'burger', kcal: 1900 })]), cheat_meal: true },
    ])

    renderPage()

    const dinner = screen.getByRole('button', { name: /Dinner/ })
    await waitFor(() => expect(dinner).toHaveTextContent('Cheat meal · 1,900 kcal'))
    const total = screen.getByTestId('day-total')
    expect(total).toHaveTextContent('Cheat meal')
    const goals = await screen.findByRole('list', { name: 'Goals' })
    expect(goals).toHaveTextContent('2,438 / 2,000 kcal')
    const ring = within(goals).getAllByTestId('ring')[0]
    expect(ring?.querySelectorAll('circle')[1]?.style.stroke).toBe('var(--goal-kcal)')
  })

  test('the day note shows under the meals heading, a meal note on its card', async () => {
    vi.mocked(fetchDayNote).mockResolvedValue('Birthday at Oma’s')
    vi.mocked(fetchDay).mockResolvedValue([
      LUNCH,
      { ...dayMeal('m2', 'dinner', []), cheat_meal: true, note: 'Pizza with colleagues' },
    ])

    renderPage()

    expect(await screen.findByText('Birthday at Oma’s')).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: /Dinner.*Pizza with colleagues/ }),
    ).toBeVisible()
  })

  test('Day options marks the day, also for the partner', async () => {
    vi.mocked(fetchMembers).mockResolvedValue([PROFILE, PARTNER])
    vi.mocked(setCheatDay).mockResolvedValue()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage()

    await user.click(await screen.findByRole('radio', { name: /baby/ }))
    await user.click(screen.getByRole('button', { name: 'Day options' }))
    const sheet = screen.getByRole('dialog', { name: 'Day' })
    await user.click(within(sheet).getByRole('switch', { name: 'Cheat day' }))

    await waitFor(() => expect(setCheatDay).toHaveBeenCalledWith('u2', '2026-10-01', true))
  })

  test('the current weight sits next to the title; tapping it enters today’s', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage()

    const weight = await screen.findByRole('button', { name: 'Weight 72.4 kg' })
    await user.click(weight)
    const sheet = within(screen.getByRole('dialog', { name: 'Weight' }))
    expect(sheet.getByLabelText('Day')).toHaveValue('2026-10-01')
    await user.clear(sheet.getByLabelText('Weight'))
    await user.type(sheet.getByLabelText('Weight'), '72,1')
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    expect(saveWeight).toHaveBeenCalledWith('u1', { date: '2026-10-01', weightKg: 72.1 })
  })

  test('without any weight yet the button offers to add one', async () => {
    vi.mocked(fetchWeights).mockResolvedValue([])
    renderPage()

    expect(await screen.findByRole('button', { name: 'Add weight' })).toBeInTheDocument()
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

    expect(screen.getByTestId('location')).toHaveTextContent('/today/meal-lunch-2026-10-01-u1')
    expect(screen.getByRole('heading', { level: 1, name: 'Lunch' })).toBeInTheDocument()
    expect(screen.getByText('Croissant')).toBeInTheDocument()
  })

  test('a save that fails after its meal was left is still reported', async () => {
    let failUpdate = (_error: Error) => {}
    vi.mocked(updateMealItem).mockReturnValue(
      new Promise<void>((_resolve, reject) => (failUpdate = reject)),
    )
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /Lunch/ }))
    await user.click(screen.getByRole('button', { name: /Cream/ }))
    const amount = screen.getByLabelText('Amount')
    await user.clear(amount)
    await user.type(amount, '200')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))
    act(() =>
      failUpdate(
        new ApiError('new row for relation "meal_items" violates check constraint', '23514'),
      ),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Some values aren’t allowed.')
  })

  test('a meal tapped before the day loaded opens its page, with Add food there', async () => {
    let finishLoading = (_meals: never[]) => {}
    vi.mocked(fetchDay).mockReturnValue(new Promise((resolve) => (finishLoading = resolve)))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /Dinner.*Loading/ }))
    act(() => finishLoading([]))
    await user.click(await screen.findByRole('button', { name: '+ Add food' }))

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/today/meal-dinner-2026-10-01-u1/food',
    )
  })

  test('a dish being added shows on its meal, which opens its Add food to continue', async () => {
    const draft = { ...newCookDraft('u1'), mealType: 'dinner' as const }
    saveCookDraft('u1', withDish(draft, { ...draft.dish, name: 'Chili' }))
    const user = userEvent.setup()
    renderPage()

    const dinner = await screen.findByRole('button', { name: /Dinner.*Unsaved dish/ })
    await user.click(dinner)

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/today/meal-dinner-2026-10-01-u1/food',
    )
  })

  test('an empty meal opens straight at its Add food', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /Dinner.*Nothing logged/ }))

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/today/meal-dinner-2026-10-01-u1/food',
    )
  })
  test('shows rings for the goal valid today', async () => {
    renderPage()

    const goals = await screen.findByRole('list', { name: 'Goals' })
    await waitFor(() => expect(goals).toHaveTextContent('538 / 2,000 kcal'))
    expect(goals).toHaveTextContent('Protein')
    expect(fetchGoals).toHaveBeenCalledWith('u1')
  })

  test('without a goal it offers to set one', async () => {
    vi.mocked(fetchGoals).mockResolvedValue([])
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Set goal' }))

    expect(screen.getByRole('dialog', { name: 'Daily Goal' })).toBeInTheDocument()
  })

  test('a goal that cannot be loaded is reported, not shown as missing', async () => {
    vi.mocked(fetchGoals)
      .mockRejectedValueOnce(new TypeError('Load failed'))
      .mockResolvedValue([GOAL])
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText(/Couldn’t load the daily goal/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Set goal' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('list', { name: 'Goals' })).toBeInTheDocument()
  })

  test('no person switch when you are alone in the household', async () => {
    renderPage()
    await screen.findByRole('list', { name: 'Goals' })

    expect(screen.queryByRole('radiogroup', { name: 'Person' })).not.toBeInTheDocument()
  })

  test('switching to the partner shows their day and goal', async () => {
    vi.mocked(fetchMembers).mockResolvedValue([PARTNER, PROFILE])
    vi.mocked(fetchGoals).mockImplementation(async (userId) => (userId === 'u1' ? [GOAL] : []))
    const user = userEvent.setup()
    renderPage()

    const person = await screen.findByRole('radiogroup', { name: 'Person' })
    const [first, second, ...rest] = within(person).getAllByRole('radio')
    expect(first).toHaveAccessibleName('Lukas')
    expect(second).toHaveAccessibleName('baby')
    expect(rest).toHaveLength(0)
    await user.click(within(person).getByRole('radio', { name: 'baby' }))

    expect(fetchDay).toHaveBeenLastCalledWith('u2', '2026-10-01')
    expect(await screen.findByText('baby hasn’t set a daily goal yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Set goal' })).not.toBeInTheDocument()
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
