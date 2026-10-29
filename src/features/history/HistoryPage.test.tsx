import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Fragment, type ReactNode } from 'react'
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
vi.mock('./historyApi', () => ({
  fetchDailyTotals: vi.fn(),
  fetchMonthNotes: vi.fn().mockResolvedValue([]),
  fetchAllNotes: vi.fn().mockResolvedValue([]),
}))
vi.mock('./week/weekApi', () => ({ fetchWeekData: vi.fn() }))
vi.mock('../trends/trendsApi', () => ({ fetchNutritionDays: vi.fn().mockResolvedValue([]) }))
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
import { addMealItem, fetchDay, fetchDayMark, fetchDayNote } from '../meals/mealsApi'
import { fetchAllNotes, fetchDailyTotals, fetchMonthNotes } from './historyApi'
import { fetchWeights } from '../weight/weightApi'
import { fetchWeekData } from './week/weekApi'
import { AddFoodSession } from '../addFood/AddFoodSession'
import { HistoryPage } from './HistoryPage'

const PROFILE = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  kcal_burned: null as number | null,
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

type User = ReturnType<typeof userEvent.setup>

/** Opens the filter menu of the calendar and picks one of its entries. */
async function pickFilter(user: User, name: string | RegExp) {
  await user.click(await screen.findByRole('button', { name: /^Filter/ }))
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name }))
}

/** Like the page stack: another address is another mounted page. */
function KeyedByPath({ children }: { readonly children: ReactNode }) {
  return <Fragment key={useLocation().pathname}>{children}</Fragment>
}

function renderPage(route = '/history', profile: typeof PROFILE = PROFILE) {
  return renderWithProviders(
    <CurrentUserContext value={{ profile, householdId: 'h1' }}>
      <AddFoodSession>
        <KeyedByPath>
          <HistoryPage />
        </KeyedByPath>
      </AddFoodSession>
      <LocationProbe />
      <OpenPartnersDay />
    </CurrentUserContext>,
    { route },
  )
}

const scrollIntoView = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  Element.prototype.scrollIntoView = scrollIntoView
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 15, 12, 0))
  vi.mocked(fetchDailyTotals).mockResolvedValue([
    { date: '2026-10-01', kcal: 1850, protein: 100, mealCount: 3, kcalEstimated: false },
    { date: '2026-10-02', kcal: 2350, protein: 60, mealCount: 2, kcalEstimated: false },
  ])
  vi.mocked(fetchGoals).mockResolvedValue([GOAL])
  vi.mocked(fetchWeights).mockResolvedValue([{ date: '2026-09-28', weightKg: 72.4 }])
  vi.mocked(fetchMonthNotes).mockResolvedValue([])
  vi.mocked(fetchAllNotes).mockResolvedValue([])
  vi.mocked(fetchWeekData).mockResolvedValue({ days: [], meals: [], foods: [], notes: [] })
  vi.mocked(fetchMembers).mockResolvedValue([PROFILE])
  vi.mocked(fetchDay).mockResolvedValue([
    dayMeal('m1', 'lunch', [mealItem({ id: 'a', name: 'Pasta', kcal: 350, basis_multiplier: 2 })]),
  ])
  vi.mocked(addMealItem).mockResolvedValue()
  vi.mocked(fetchDayMark).mockResolvedValue(null)
  vi.mocked(fetchDayNote).mockResolvedValue(null)
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

  test('marks days with a note, a weigh-in or estimated calories', async () => {
    vi.mocked(fetchMonthNotes).mockResolvedValue([
      { date: '2026-10-01', mealType: null, text: 'Birthday at Oma’s' },
    ])
    vi.mocked(fetchWeights).mockResolvedValue([{ date: '2026-10-01', weightKg: 72 }])
    vi.mocked(fetchDailyTotals).mockResolvedValue([
      { ...complete('2026-10-01'), kcalEstimated: true },
      complete('2026-10-02'),
    ])
    renderPage()

    expect(
      await screen.findByRole('button', {
        name: 'October 1, within goal, has a note, weigh-in, estimated calories',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'October 2, within goal' })).toBeInTheDocument()
    expect(fetchMonthNotes).toHaveBeenCalledWith('u1', '2026-10-01', '2026-10-31')
  })

  const openDay = (user: ReturnType<typeof userEvent.setup>, label: string) =>
    screen
      .findByRole('button', { name: new RegExp(`^${label}\\b`) })
      .then((button) => user.click(button))

  test('the week bar shows the average of the counted days of the open day’s week', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([
      complete('2026-10-01'),
      { ...complete('2026-10-02'), kcal: 2400 },
      { ...complete('2026-10-03'), kcal: 9000, cheatDay: true },
    ])
    const user = userEvent.setup()
    renderPage()

    await openDay(user, 'October 1')

    expect(await screen.findByRole('button', { name: 'Week 40, average 2,100 kcal' })).toBeVisible()
  })

  test('the week bar shows the running week while no day is open', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([complete('2026-10-12')])
    renderPage()

    expect(await screen.findByRole('button', { name: 'Week 42, average 1,800 kcal' })).toBeVisible()
  })

  test('the week bar is left out when the shown month has neither an open day nor the running week', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Previous month' }))
    await screen.findByRole('heading', { name: /September 2026/ })

    expect(screen.queryByRole('button', { name: /^Week \d+/ })).not.toBeInTheDocument()
  })

  test('the week bar falls back to the running week when the open day is in another month', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Previous month' }))
    await openDay(user, 'September 15')
    expect(await screen.findByRole('button', { name: /^Week 38/ })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Next month' }))

    expect(await screen.findByRole('button', { name: /^Week 42/ })).toBeVisible()
    expect(screen.queryByRole('button', { name: /^Week 38/ })).not.toBeInTheDocument()
  })

  test('the week bar is left out when the open day sits on an edge cell of the shown month that is not drawn', async () => {
    const user = userEvent.setup()
    renderPage()
    await openDay(user, 'October 1')
    expect(await screen.findByRole('button', { name: /^Week 40/ })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    await screen.findByRole('heading', { name: /September 2026/ })

    expect(screen.queryByRole('button', { name: /^Week \d+/ })).not.toBeInTheDocument()
  })

  describe('the saved figure in the week bar', () => {
    const BURNING = { ...PROFILE, kcal_burned: 2600 }
    const days = [complete('2026-10-01'), complete('2026-10-02'), complete('2026-10-05')]
    const serve = (failEdges = false) =>
      vi.mocked(fetchDailyTotals).mockImplementation(async (_userId, first, last) => {
        if (failEdges && first < '2026-10-01') throw new Error('offline')
        return days.filter((day) => day.date >= first && day.date <= last)
      })

    test('is burned minus eaten over the counted days of the week', async () => {
      serve()
      const user = userEvent.setup()
      renderPage('/history', BURNING)

      await openDay(user, 'October 1')
      expect(
        await screen.findByRole('button', {
          name: 'Week 40, average 1,800 kcal, 1,600 kcal saved',
        }),
      ).toBeVisible()
      await openDay(user, 'October 5')
      expect(
        await screen.findByRole('button', { name: 'Week 41, average 1,800 kcal, 800 kcal saved' }),
      ).toBeVisible()
    })

    test('is left out of a week across two months when the other month’s days failed to load', async () => {
      serve(true)
      const user = userEvent.setup()
      renderPage('/history', BURNING)

      // no figures made of only some of its days
      await openDay(user, 'October 1')
      await waitFor(() =>
        expect(fetchDailyTotals).toHaveBeenCalledWith('u1', '2026-09-28', '2026-09-30'),
      )
      expect(screen.getByRole('button', { name: 'Week 40' })).toBeVisible()
      await openDay(user, 'October 5')
      expect(
        await screen.findByRole('button', { name: 'Week 41, average 1,800 kcal, 800 kcal saved' }),
      ).toBeVisible()
    })

    test('is left out of the first week while the other month’s days load', async () => {
      vi.mocked(fetchDailyTotals).mockImplementation(async (_userId, first, last) =>
        first < '2026-10-01'
          ? new Promise(() => {})
          : days.filter((day) => day.date >= first && day.date <= last),
      )
      const user = userEvent.setup()
      renderPage('/history', BURNING)

      await openDay(user, 'October 1')
      expect(await screen.findByRole('button', { name: 'Week 40' })).toBeVisible()
    })
  })

  test('a week across two months averages all its days, whichever month shows it', async () => {
    const days = [
      { ...complete('2026-09-29'), kcal: 1000 },
      { ...complete('2026-10-01'), kcal: 3000 },
    ]
    vi.mocked(fetchDailyTotals).mockImplementation(async (_userId, first, last) =>
      days.filter((day) => day.date >= first && day.date <= last),
    )
    const user = userEvent.setup()
    renderPage()

    await openDay(user, 'October 1')
    expect(await screen.findByRole('button', { name: 'Week 40, average 2,000 kcal' })).toBeVisible()
    // the days of the neighbouring month are not drawn
    expect(screen.queryByRole('button', { name: /September 29/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    await openDay(user, 'September 29')

    expect(await screen.findByRole('button', { name: 'Week 40, average 2,000 kcal' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /October 1\b/ })).not.toBeInTheDocument()
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
      {
        date: '2026-10-04',
        kcal: 0,
        protein: 0,
        mealCount: 0,
        kcalEstimated: false,
        alcoholDay: true,
      },
    ])
    renderPage()

    await screen.findByRole('button', { name: /October 4.*alcohol day/ })
    expect(screen.getByRole('button', { name: /October 4.*alcohol day/ })).toBeInTheDocument()
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

    await screen.findByRole('button', { name: /October 11.*lunch or dinner missing/ })
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

  test('holding a day shows its verdict, calories and note without opening it', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([complete('2026-10-01')])
    vi.mocked(fetchMonthNotes).mockResolvedValue([
      { date: '2026-10-01', mealType: null, text: 'Birthday at Oma’s' },
    ])
    vi.mocked(fetchDayNote).mockResolvedValue('Birthday at Oma’s')
    renderPage()
    const day = await screen.findByRole('button', { name: /^October 1,.*has a note/ })

    fireEvent.pointerDown(day, { pointerId: 1, isPrimary: true, clientX: 50, clientY: 50 })
    const look = await screen.findByRole('dialog', {}, { timeout: 2000 })
    expect(look).toHaveTextContent(/Within goal/)
    expect(look).toHaveTextContent('1,800 of 2,000 kcal')
    expect(await within(look).findByText('Birthday at Oma’s')).toBeInTheDocument()
    fireEvent.pointerUp(day, { pointerId: 1, isPrimary: true, clientX: 50, clientY: 50 })
    fireEvent.click(day)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/history$/)
  })

  test('swiping the calendar shows the previous month, and Today comes back', async () => {
    renderPage()
    const grid = await screen.findByRole('table')

    fireEvent.pointerDown(grid, { pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
    fireEvent.pointerUp(grid, { pointerId: 1, isPrimary: true, clientX: 240, clientY: 300 })

    expect(await screen.findByRole('heading', { name: /September 2026/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Today' }))
    expect(await screen.findByRole('heading', { name: /October 2026/ })).toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/history$/)
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

  describe('the open day', () => {
    const LUNCH_AND_DINNER = [
      dayMeal('m1', 'lunch', [mealItem({ id: 'a', name: 'Pasta', kcal: 900 })]),
      dayMeal('m2', 'dinner', [mealItem({ id: 'b', name: 'Soup', kcal: 900 })]),
    ]

    test('starts with a status pill, in words', async () => {
      vi.mocked(fetchDay).mockResolvedValue(LUNCH_AND_DINNER)
      renderPage('/history/2026-10-01')

      const day = await screen.findByRole('region', { name: /October 1/ })
      expect(await within(day).findByTestId('day-status')).toHaveTextContent(
        'Within goal · 200 kcal left',
      )
    })

    test('says what is missing when a main meal has no food', async () => {
      renderPage('/history/2026-10-12')

      const day = await screen.findByRole('region', { name: /October 12/ })
      expect(await within(day).findByTestId('day-status')).toHaveTextContent(
        'Dinner missing · not counted',
      )
    })

    test('names a day marked as alcohol day', async () => {
      vi.mocked(fetchDay).mockResolvedValue(LUNCH_AND_DINNER)
      vi.mocked(fetchDayMark).mockResolvedValue('alcohol')
      renderPage('/history/2026-10-01')

      expect(await screen.findByTestId('day-status')).toHaveTextContent('Alcohol day · not counted')
    })

    test('says so when there is no goal', async () => {
      vi.mocked(fetchDay).mockResolvedValue(LUNCH_AND_DINNER)
      vi.mocked(fetchGoals).mockResolvedValue([])
      renderPage('/history/2026-10-01')

      expect(await screen.findByTestId('day-status')).toHaveTextContent('No goal set')
    })

    test('never judges today', async () => {
      vi.mocked(fetchDay).mockResolvedValue(LUNCH_AND_DINNER)
      renderPage('/history/2026-10-15')

      expect(await screen.findByTestId('day-status')).toHaveTextContent('So far · 200 kcal left')
    })

    test('shows the Note row right under the pill, with the note once', async () => {
      vi.mocked(fetchDay).mockResolvedValue(LUNCH_AND_DINNER)
      vi.mocked(fetchDayNote).mockResolvedValue('Birthday at Oma’s')
      renderPage('/history/2026-10-01')

      const row = await screen.findByRole('button', { name: /^Day note: Birthday at Oma’s/ })
      expect(screen.getAllByText('Birthday at Oma’s')).toHaveLength(1)
      const pill = screen.getByTestId('day-status')
      expect(pill.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    test('the Note row says "Add a note" without a note', async () => {
      vi.mocked(fetchDay).mockResolvedValue(LUNCH_AND_DINNER)
      renderPage('/history/2026-10-01')

      await screen.findByTestId('day-status')
      expect(screen.getByRole('button', { name: /^Day note: Add a note/ })).toBeVisible()
    })

    test('the Note row opens the note page below the day; Cancel leads back to the day', async () => {
      const user = userEvent.setup()
      vi.mocked(fetchDay).mockResolvedValue(LUNCH_AND_DINNER)
      renderPage('/history/2026-10-01')

      await user.click(await screen.findByRole('button', { name: /^Day note: Add a note/ }))
      expect(screen.getByTestId('path').textContent).toBe('/history/2026-10-01/note-2026-10-01-u1')
      expect(await screen.findByRole('textbox', { name: 'Note' })).toBeVisible()
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.getByTestId('path').textContent).toBe('/history/2026-10-01')
    })

    test('a meal note is on its meal card right away, with a dot', async () => {
      vi.mocked(fetchDay).mockResolvedValue([
        { ...dayMeal('m1', 'lunch', [mealItem({ id: 'a', kcal: 900 })]), note: 'Restaurant' },
        dayMeal('m2', 'dinner', [mealItem({ id: 'b', kcal: 900 })]),
      ])
      renderPage('/history/2026-10-01')

      const lunch = await screen.findByRole('button', { name: /Lunch.*Restaurant/ })
      expect(within(lunch).getByTestId('meal-note-dot')).toHaveClass('bg-accent-ink')
    })
  })
})

describe('the month below the calendar', () => {
  test('shows no summary lines under the calendar', async () => {
    renderPage()

    await screen.findByRole('button', { name: /^October 1,/ })
    expect(screen.queryByTestId('month-summary')).not.toBeInTheDocument()
    expect(screen.queryByTestId('month-highlights')).not.toBeInTheDocument()
  })

  test('shows an error when the totals of the month fail to load', async () => {
    vi.mocked(fetchDailyTotals).mockRejectedValue(new Error('boom'))
    renderPage()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  test('a filter fades the days that do not match and survives opening a day', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([
      complete('2026-10-01'),
      { ...complete('2026-10-02'), alcoholDay: true },
    ])
    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByRole('button', { name: 'Filter' })).toBeInTheDocument()

    await pickFilter(user, 'Alcohol')

    expect(screen.getByRole('button', { name: 'Filter: Alcohol' })).toBeInTheDocument()
    expect(screen.getByText('Alcohol highlighted')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^October 1,/ })).toHaveAttribute(
      'data-faded',
      'true',
    )
    expect(screen.getByRole('button', { name: /^October 2,/ })).not.toHaveAttribute('data-faded')

    // the page mounts again for another address: the filter rides along
    await user.click(screen.getByRole('button', { name: /^October 2,/ }))
    expect(screen.getByTestId('path')).toHaveTextContent('/history/2026-10-02')
    expect(screen.getByRole('button', { name: 'Filter: Alcohol' })).toBeInTheDocument()

    // one at a time, and picking the active one again clears it
    await pickFilter(user, 'Notes')
    expect(screen.getByRole('button', { name: 'Filter: Notes' })).toBeInTheDocument()
    await pickFilter(user, 'Notes, selected')
    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument()
    expect(screen.queryByText(/highlighted/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^October 1,/ })).not.toHaveAttribute('data-faded')
  })

  test('the Notes filter keeps the days with a note', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([complete('2026-10-01'), complete('2026-10-02')])
    vi.mocked(fetchMonthNotes).mockResolvedValue([
      { date: '2026-10-02', mealType: null, text: 'Hike' },
    ])
    const user = userEvent.setup()
    renderPage()

    await pickFilter(user, 'Notes')

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^October 1,/ })).toHaveAttribute('data-faded'),
    )
    expect(screen.getByRole('button', { name: /^October 2,/ })).not.toHaveAttribute('data-faded')
  })

  test('fades nothing for the Notes filter while the notes are loading', async () => {
    vi.mocked(fetchMonthNotes).mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderPage()

    await pickFilter(user, 'Notes')
    await screen.findByRole('button', { name: /^October 1,/ })

    expect(screen.getByRole('button', { name: /^October 1,/ })).not.toHaveAttribute('data-faded')
  })

  test('fades nothing for a totals filter while the month totals are loading', async () => {
    vi.mocked(fetchDailyTotals).mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderPage()

    await pickFilter(user, 'Missing')

    expect(screen.getByRole('button', { name: /^October 1\b/ })).not.toHaveAttribute('data-faded')
  })

  test('shows an error, and fades nothing, when the notes of the month fail', async () => {
    vi.mocked(fetchMonthNotes).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    renderPage()

    await pickFilter(user, 'Notes')

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^October 1,/ })).not.toHaveAttribute('data-faded')
  })

  test('the Cheat filter keeps a day with a cheat meal even when it is an alcohol day', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([
      complete('2026-10-01'),
      { ...complete('2026-10-02'), alcoholDay: true, cheatMeal: true },
    ])
    const user = userEvent.setup()
    renderPage()

    await pickFilter(user, 'Cheat')

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^October 1,/ })).toHaveAttribute('data-faded'),
    )
    expect(screen.getByRole('button', { name: /^October 2,/ })).not.toHaveAttribute('data-faded')
  })

  test('does not fade the open day', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([complete('2026-10-01'), complete('2026-10-02')])
    const user = userEvent.setup()
    renderPage('/history/2026-10-01')

    await pickFilter(user, 'Alcohol')

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^October 2,/ })).toHaveAttribute('data-faded'),
    )
    expect(screen.getByRole('button', { name: /^October 1,/ })).not.toHaveAttribute('data-faded')
  })

  test('opening a day from outside takes the filter of that navigation, none when absent', async () => {
    const user = userEvent.setup()
    renderPage()
    await pickFilter(user, 'Alcohol')
    expect(screen.getByRole('button', { name: 'Filter: Alcohol' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open partner’s day' }))

    expect(await screen.findByRole('button', { name: 'Filter' })).toBeInTheDocument()
  })
})

describe('the views of History', () => {
  const OCTOBER_NOTES = [
    { date: '2026-10-12', mealType: null, text: 'Birthday at Oma’s' },
    { date: '2026-10-12', mealType: 'dinner', text: 'Pizza' },
  ] as const
  const SEPTEMBER_NOTE = { date: '2026-09-03', mealType: 'lunch', text: 'Salad' } as const

  async function openNotes(user: User) {
    await user.click(await screen.findByRole('radio', { name: 'Notes' }))
  }

  test('offers Calendar, Notes and Trends, starting on the calendar', async () => {
    renderPage()

    const view = await screen.findByRole('radiogroup', { name: 'View' })
    expect(
      within(view)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('aria-label') ?? radio.textContent),
    ).toEqual(['Calendar', 'Notes', 'Trends'])
    expect(within(view).getByRole('radio', { name: 'Calendar' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('the calendar view has no list of notes, no chips and no key until asked for', async () => {
    vi.mocked(fetchMonthNotes).mockResolvedValue([...OCTOBER_NOTES])
    renderPage()

    await screen.findByRole('button', { name: /^October 1,/ })
    expect(screen.queryByTestId('month-summary')).not.toBeInTheDocument()
    expect(screen.queryByTestId('month-highlights')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Notes of the month' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Highlight days' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Key' })).not.toBeInTheDocument()
  })

  test('the filter and options buttons sit in the page header, not in the month header', async () => {
    renderPage()

    const header = (await screen.findByRole('heading', { name: 'History' })).closest('header')!
    expect(within(header).getByRole('button', { name: 'Filter' })).toBeInTheDocument()
    expect(within(header).getByRole('button', { name: 'Calendar options' })).toBeInTheDocument()

    const monthSection = screen.getByRole('heading', { name: 'October 2026' }).closest('section')!
    expect(within(monthSection).queryByRole('button', { name: /^Filter/ })).not.toBeInTheDocument()
    expect(
      within(monthSection).queryByRole('button', { name: 'Calendar options' }),
    ).not.toBeInTheDocument()
    const monthHeaderRow = screen
      .getByRole('heading', { name: 'October 2026' })
      .closest('.flex')!.parentElement!
    const names = within(monthHeaderRow)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? button.textContent)
      .slice(0, 3)
    expect(names).toEqual(['Previous month', expect.stringContaining('October 2026'), 'Next month'])
  })

  test('the year overview keeps the buttons in the page header only', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Calendar options' }))
    await user.click(screen.getByRole('button', { name: 'Year overview' }))

    const yearSection = (await screen.findByRole('heading', { name: '2026' })).closest('section')!
    expect(within(yearSection).queryByRole('button', { name: /^Filter/ })).not.toBeInTheDocument()
    expect(
      within(yearSection).queryByRole('button', { name: 'Calendar options' }),
    ).not.toBeInTheDocument()
    const header = screen.getByRole('heading', { name: 'History' }).closest('header')!
    expect(within(header).getByRole('button', { name: 'Filter' })).toBeInTheDocument()
    await user.click(within(header).getByRole('button', { name: 'Calendar options' }))
    expect(screen.queryByRole('button', { name: 'Year overview' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show key' })).toBeInTheDocument()
  })

  test('the Notes and Trends views have no filter or options buttons', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('button', { name: 'Calendar options' })

    await user.click(screen.getByRole('radio', { name: 'Notes' }))
    expect(screen.queryByRole('button', { name: /^Filter/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Calendar options' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Trends' }))
    expect(screen.queryByRole('button', { name: /^Filter/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Calendar options' })).not.toBeInTheDocument()
  })

  test('the calendar options menu shows the key and hides it again', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Calendar options' }))
    await user.click(screen.getByRole('button', { name: 'Show key' }))
    expect(screen.getByRole('heading', { name: 'Key' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Calendar options' }))
    await user.click(screen.getByRole('button', { name: 'Hide key' }))
    expect(screen.queryByRole('heading', { name: 'Key' })).not.toBeInTheDocument()
  })

  test('the Notes view lists every month’s notes, and a tap opens that day in the calendar', async () => {
    vi.mocked(fetchAllNotes).mockResolvedValue([...OCTOBER_NOTES, SEPTEMBER_NOTE])
    const user = userEvent.setup()
    renderPage()
    await openNotes(user)

    expect(await screen.findByRole('heading', { name: 'September 2026' })).toBeInTheDocument()
    expect(fetchAllNotes).toHaveBeenCalledWith('u1')
    await user.click(screen.getByRole('button', { name: /Salad/ }))

    expect(screen.getByTestId('path')).toHaveTextContent('/history/2026-09-03')
    expect(screen.getByRole('radio', { name: 'Calendar' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('heading', { level: 2, name: 'September 2026' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /September 3/ })).toBeInTheDocument()
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1))
  })

  test('a tap on a note of another day scrolls that day’s section into view, after the page remounts', async () => {
    vi.mocked(fetchAllNotes).mockResolvedValue([...OCTOBER_NOTES, SEPTEMBER_NOTE])
    const user = userEvent.setup()
    renderPage('/history/2026-10-05')
    await screen.findByRole('region', { name: /October 5/ })
    expect(scrollIntoView).not.toHaveBeenCalled()
    await openNotes(user)

    await user.click(await screen.findByRole('button', { name: /Salad/ }))

    const section = await screen.findByRole('region', { name: /September 3/ })
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1))
    expect(scrollIntoView.mock.contexts[0]).toBe(section)
  })

  test('a tap on a note of the day already open scrolls too, and later day taps do not', async () => {
    vi.mocked(fetchAllNotes).mockResolvedValue([...OCTOBER_NOTES])
    const user = userEvent.setup()
    renderPage('/history/2026-10-12')
    await screen.findByRole('region', { name: /October 12/ })
    await openNotes(user)

    await user.click(await screen.findByRole('button', { name: /Pizza/ }))
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1))

    await user.click(await screen.findByRole('button', { name: /October 13/ }))
    await screen.findByRole('region', { name: /October 13/ })
    await user.click(screen.getByRole('button', { name: /October 12/ }))
    await screen.findByRole('region', { name: /October 12/ })
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })

  test('typing in the notes search keeps the focus', async () => {
    vi.mocked(fetchAllNotes).mockResolvedValue([...OCTOBER_NOTES])
    const user = userEvent.setup()
    renderPage()
    await openNotes(user)
    const search = await screen.findByRole('searchbox', { name: 'Search notes' })

    await user.type(search, 'Piz')

    expect(screen.getByRole('searchbox', { name: 'Search notes' })).toHaveFocus()
    expect(screen.getByRole('searchbox', { name: 'Search notes' })).toHaveValue('Piz')
  })

  test('the notes search is still there after a note was opened and Notes is chosen again', async () => {
    vi.mocked(fetchAllNotes).mockResolvedValue([...OCTOBER_NOTES])
    const user = userEvent.setup()
    renderPage()
    await openNotes(user)
    await user.type(await screen.findByRole('searchbox', { name: 'Search notes' }), 'Piz')
    await user.click(screen.getByRole('button', { name: /Pizza/ }))
    await screen.findByRole('region', { name: /October 12/ })

    await openNotes(user)

    expect(await screen.findByRole('searchbox', { name: 'Search notes' })).toHaveValue('Piz')
  })

  test('a note keeps the filter when it opens its day', async () => {
    vi.mocked(fetchAllNotes).mockResolvedValue([...OCTOBER_NOTES])
    const user = userEvent.setup()
    renderPage()
    await pickFilter(user, 'Cheat')
    await openNotes(user)

    await user.click(await screen.findByRole('button', { name: /Pizza/ }))

    expect(await screen.findByRole('button', { name: 'Filter: Cheat' })).toBeInTheDocument()
  })

  test('the Notes view stays after switching person, and shows the partner’s notes', async () => {
    vi.mocked(fetchMembers).mockResolvedValue([PROFILE, PARTNER])
    vi.mocked(fetchAllNotes).mockImplementation(async (userId) =>
      userId === 'u2'
        ? [{ date: '2026-10-05', mealType: null, text: 'Partner note' }]
        : [...OCTOBER_NOTES],
    )
    const user = userEvent.setup()
    renderPage()
    await openNotes(user)
    await screen.findByText('Birthday at Oma’s')

    await user.click(screen.getByRole('radio', { name: 'baby' }))

    expect(await screen.findByText('Partner note')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Notes' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByText('Birthday at Oma’s')).not.toBeInTheDocument()
  })

  test('the Trends view stays after switching person too', async () => {
    vi.mocked(fetchMembers).mockResolvedValue([PROFILE, PARTNER])
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('radio', { name: 'Trends' }))

    await user.click(screen.getByRole('radio', { name: 'baby' }))

    expect(screen.getByRole('radio', { name: 'Trends' })).toHaveAttribute('aria-checked', 'true')
  })

  test('coming from elsewhere shows the calendar, whatever view was open', async () => {
    const user = userEvent.setup()
    renderPage()
    await openNotes(user)

    await user.click(screen.getByRole('button', { name: 'Open partner’s day' }))

    expect(await screen.findByRole('radio', { name: 'Calendar' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('opened with a view in the navigation state, shows that view; anything else the calendar', async () => {
    renderWithProviders(
      <CurrentUserContext value={{ profile: PROFILE, householdId: 'h1' }}>
        <AddFoodSession>
          <HistoryPage />
        </AddFoodSession>
      </CurrentUserContext>,
      { route: '/history', state: { view: 'notes' } },
    )

    expect(await screen.findByRole('radio', { name: 'Notes' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })
})

describe('the year overview', () => {
  async function openYear(user: User) {
    await user.click(await screen.findByRole('button', { name: 'Calendar options' }))
    await user.click(screen.getByRole('button', { name: 'Year overview' }))
  }
  const cell = (date: string) => document.querySelector(`[data-date="${date}"]`)

  test('opens from the calendar options and shows the twelve months of the year, colored', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([
      complete('2026-09-05'),
      { ...complete('2026-10-02'), kcal: 2600 },
      { ...complete('2026-10-03'), alcoholDay: true },
    ])
    const user = userEvent.setup()
    renderPage()

    await openYear(user)

    expect(await screen.findByRole('heading', { level: 2, name: '2026' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^\w+ 2026$/ })).toHaveLength(12)
    expect(fetchDailyTotals).toHaveBeenCalledWith('u1', '2026-01-01', '2026-12-31')
    await waitFor(() => expect(cell('2026-09-05')).toHaveAttribute('data-status', 'onTarget'))
    expect(cell('2026-10-02')).toHaveAttribute('data-status', 'wellOver')
    expect(cell('2026-10-03')).toHaveAttribute('data-status', 'alcoholDay')
    expect(screen.queryByRole('button', { name: 'Previous month' })).not.toBeInTheDocument()
  })

  test('opens from the month title too', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'October 2026' }))

    expect(await screen.findByRole('heading', { level: 2, name: '2026' })).toBeInTheDocument()
  })

  test('tapping a month opens it in the calendar', async () => {
    const user = userEvent.setup()
    renderPage()
    await openYear(user)

    await user.click(await screen.findByRole('button', { name: 'March 2026' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'March 2026' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous year' })).not.toBeInTheDocument()
  })

  test('turns to earlier years, and has no next year beyond the current one', async () => {
    const user = userEvent.setup()
    renderPage()
    await openYear(user)

    expect(await screen.findByRole('button', { name: 'Next year' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Previous year' }))

    expect(await screen.findByRole('heading', { level: 2, name: '2025' })).toBeInTheDocument()
    expect(fetchDailyTotals).toHaveBeenCalledWith('u1', '2025-01-01', '2025-12-31')
    expect(screen.getByRole('button', { name: 'Next year' })).toBeEnabled()
  })

  test('shows the month shown before as the year, and stays in the year when a day is opened elsewhere', async () => {
    const user = userEvent.setup()
    renderPage('/history/2025-12-10')
    await openYear(user)

    expect(await screen.findByRole('heading', { level: 2, name: '2025' })).toBeInTheDocument()
    // no day card and no hint below the year
    expect(screen.queryByRole('region', { name: /December 10/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Tap a day to see what was eaten.')).not.toBeInTheDocument()

    // opening a month brings the open day back with the month
    await user.click(screen.getByRole('button', { name: 'December 2025' }))
    expect(await screen.findByRole('region', { name: /December 10/ })).toBeInTheDocument()
  })

  test('shows no hint below the year when no day is open', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByText('Tap a day to see what was eaten.')).toBeInTheDocument()
    await openYear(user)

    await screen.findByRole('heading', { level: 2, name: '2026' })
    expect(screen.queryByText('Tap a day to see what was eaten.')).not.toBeInTheDocument()
  })

  test('shows an error when the goals fail to load', async () => {
    vi.mocked(fetchGoals).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    renderPage()
    await openYear(user)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  test('marks the year busy while it loads, and not afterwards', async () => {
    const user = userEvent.setup()
    renderPage()
    await openYear(user)

    const section = (await screen.findByRole('heading', { level: 2, name: '2026' })).closest(
      'section',
    )
    await waitFor(() => expect(section).toHaveAttribute('aria-busy', 'false'))
  })

  test('is busy while the totals are on their way', async () => {
    vi.mocked(fetchDailyTotals).mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderPage()
    await openYear(user)

    const heading = await screen.findByRole('heading', { level: 2, name: '2026' })
    expect(heading.closest('section')).toHaveAttribute('aria-busy', 'true')
  })

  test('the Notes filter fades the small days without a note', async () => {
    vi.mocked(fetchAllNotes).mockResolvedValue([
      { date: '2026-03-04', mealType: null, text: 'Spring' },
    ])
    const user = userEvent.setup()
    renderPage()
    await openYear(user)
    await screen.findByRole('heading', { level: 2, name: '2026' })

    await pickFilter(user, 'Notes')

    await waitFor(() => expect(cell('2026-03-05')).toHaveAttribute('data-faded', 'true'))
    expect(cell('2026-03-04')).not.toHaveAttribute('data-faded')
  })

  test('the Notes filter fades nothing while the notes load, and shows their error', async () => {
    vi.mocked(fetchAllNotes).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    renderPage()
    await openYear(user)
    await screen.findByRole('heading', { level: 2, name: '2026' })

    await pickFilter(user, 'Notes')

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(cell('2026-03-05')).not.toHaveAttribute('data-faded')
  })

  test('a year after the current one in the state falls back to the shown month’s year', async () => {
    renderWithProviders(
      <CurrentUserContext value={{ profile: PROFILE, householdId: 'h1' }}>
        <AddFoodSession>
          <HistoryPage />
        </AddFoodSession>
      </CurrentUserContext>,
      { route: '/history', state: { calendarZoom: 'year', year: 2030 } },
    )

    expect(await screen.findByRole('heading', { level: 2, name: '2026' })).toBeInTheDocument()
  })

  test('shows an error when the totals of the year fail to load', async () => {
    vi.mocked(fetchDailyTotals).mockImplementation(async (_userId, first) => {
      if (first === '2026-01-01') throw new Error('boom')
      return []
    })
    const user = userEvent.setup()
    renderPage()
    await openYear(user)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^\w+ 2026$/ })).toHaveLength(12)
  })

  test('shows neutral cells while the year loads', async () => {
    vi.mocked(fetchDailyTotals).mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderPage()
    await openYear(user)

    await screen.findByRole('heading', { level: 2, name: '2026' })
    expect(cell('2026-10-02')).toHaveAttribute('data-status', 'none')
  })

  test('a filter fades the small days that do not match', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([
      { ...complete('2026-10-02'), alcoholDay: true },
      complete('2026-10-03'),
    ])
    const user = userEvent.setup()
    renderPage()
    await openYear(user)
    await waitFor(() => expect(cell('2026-10-02')).toHaveAttribute('data-status', 'alcoholDay'))

    await pickFilter(user, 'Alcohol')

    expect(cell('2026-10-02')).not.toHaveAttribute('data-faded')
    expect(cell('2026-10-03')).toHaveAttribute('data-faded', 'true')
  })

  test('stays on the year shown after another navigation of the page', async () => {
    const user = userEvent.setup()
    renderPage()
    await openYear(user)
    await user.click(await screen.findByRole('button', { name: 'Previous year' }))
    await screen.findByRole('heading', { level: 2, name: '2025' })

    // the page remounts for another address: the zoom and year ride in the state
    await user.click(screen.getByRole('button', { name: 'Filter' }))
    await user.click(screen.getByRole('button', { name: 'Missing' }))

    expect(screen.getByRole('heading', { level: 2, name: '2025' })).toBeInTheDocument()
  })
})

describe('HistoryPage weeks', () => {
  const BURNING = { ...PROFILE, kcal_burned: 2500 }

  test('shows the calories saved in the week bar', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([
      complete('2026-10-01'),
      complete('2026-10-02'),
      { ...complete('2026-10-03'), cheatDay: true },
    ])
    const user = userEvent.setup()
    renderPage('/history', BURNING)
    await user.click(await screen.findByRole('button', { name: /^October 1\b/ }))

    // two counted days: 2 × (2,500 − 1,800); the cheat day is not part of it
    expect(
      await screen.findByRole('button', { name: 'Week 40, average 1,800 kcal, 1,400 kcal saved' }),
    ).toBeVisible()
  })

  test('shows no saved figure without a burned goal', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([complete('2026-10-01')])
    renderPage()

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /^October 1\b/ }))
    expect(await screen.findByRole('button', { name: 'Week 40, average 1,800 kcal' })).toBeVisible()
  })

  test('the week bar opens the week page, and Back returns to the same month', async () => {
    const user = userEvent.setup()
    renderPage('/history', BURNING)
    await user.click(await screen.findByRole('button', { name: 'Previous month' }))
    await screen.findByRole('heading', { name: /September 2026/ })
    await user.click(await screen.findByRole('button', { name: /^September 22\b/ }))

    await user.click(await screen.findByRole('button', { name: /^Week 39/ }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Week 39' })).toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent('/history/week-2026-39')
    expect(fetchWeekData).toHaveBeenCalledWith('u1', '2026-09-21', '2026-09-27')

    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(await screen.findByRole('heading', { name: /September 2026/ })).toBeInTheDocument()
    // the day that was open still is
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/history\/2026-09-22$/)
  })

  test('the week of the partner opens for the partner', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchMembers).mockResolvedValue([PROFILE, PARTNER])
    renderPage()
    await user.click(await screen.findByRole('radio', { name: 'baby' }))

    await user.click(await screen.findByRole('button', { name: /^October 7\b/ }))
    await user.click(await screen.findByRole('button', { name: /^Week 41/ }))

    await waitFor(() =>
      expect(fetchWeekData).toHaveBeenCalledWith('u2', '2026-10-05', '2026-10-11'),
    )
  })

  test('Calendar options › This week opens the running week, with what it saved so far', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchWeekData).mockResolvedValue({
      days: [{ ...complete('2026-10-13'), carbs: 0, fat: 0, fiber: 0 }],
      meals: [],
      foods: [],
      notes: [],
    })
    renderPage('/history', BURNING)

    await user.click(await screen.findByRole('button', { name: 'Calendar options' }))
    const row = await within(screen.getByRole('dialog')).findByRole('button', {
      name: /This week.*700 kcal saved so far/,
    })
    await user.click(row)

    expect(await screen.findByRole('heading', { level: 1, name: 'This week' })).toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent('/history/week-2026-42')
    expect(fetchWeekData).toHaveBeenCalledWith('u1', '2026-10-12', '2026-10-18')
  })

  test('an address of a week that does not exist shows the calendar', async () => {
    renderPage('/history/week-2026-54')

    expect(await screen.findByRole('heading', { name: /October 2026/ })).toBeInTheDocument()
  })
})
