import { fireEvent, screen, waitFor, within } from '@testing-library/react'
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
vi.mock('./historyApi', () => ({
  fetchDailyTotals: vi.fn(),
  fetchMonthNotes: vi.fn().mockResolvedValue([]),
}))
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
import { fetchDailyTotals, fetchMonthNotes } from './historyApi'
import { fetchWeights } from '../weight/weightApi'
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

  test('shows the average of the counted days at the end of each week', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([
      complete('2026-10-01'),
      { ...complete('2026-10-02'), kcal: 2400 },
      { ...complete('2026-10-03'), kcal: 9000, cheatDay: true },
    ])
    renderPage()

    await waitFor(() =>
      expect(screen.getAllByTestId('week-average').map((cell) => cell.textContent)).toContain(
        '2,100',
      ),
    )
    expect(
      screen.getAllByTestId('week-average').filter((cell) => cell.textContent !== ''),
    ).toHaveLength(1)
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

    await waitFor(() => expect(screen.getAllByTestId('week-average')[0]).toHaveTextContent('2,000'))
    // the days of the neighbouring month are not drawn, and don't join the month's summary
    expect(screen.getByTestId('month-summary')).toHaveTextContent('1 day logged · Ø 3,000 kcal')

    await user.click(screen.getByRole('button', { name: 'Previous month' }))

    await waitFor(() =>
      expect(screen.getAllByTestId('week-average').at(-1)).toHaveTextContent('2,000'),
    )
    expect(screen.getByTestId('month-summary')).toHaveTextContent('1 day logged · Ø 1,000 kcal')
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

    const summary = await screen.findByTestId('month-summary')
    await waitFor(() =>
      expect(summary).toHaveTextContent('1 day logged · Ø 1,850 kcal · 3 days left out'),
    )
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

    test('shows the day note as a card right under the pill, once', async () => {
      vi.mocked(fetchDay).mockResolvedValue(LUNCH_AND_DINNER)
      vi.mocked(fetchDayNote).mockResolvedValue('Birthday at Oma’s')
      renderPage('/history/2026-10-01')

      const card = await screen.findByRole('group', { name: 'Note' })
      expect(card).toHaveTextContent('Birthday at Oma’s')
      expect(screen.getAllByText('Birthday at Oma’s')).toHaveLength(1)
      const pill = screen.getByTestId('day-status')
      expect(pill.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    test('shows no note card without a note', async () => {
      vi.mocked(fetchDay).mockResolvedValue(LUNCH_AND_DINNER)
      renderPage('/history/2026-10-01')

      await screen.findByTestId('day-status')
      expect(screen.queryByRole('group', { name: 'Note' })).not.toBeInTheDocument()
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
  test('the summary adds the days within goal, the longest streak and the weight change', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([
      complete('2026-10-01'),
      { ...complete('2026-10-02'), kcal: 2600 },
      complete('2026-10-03'),
      complete('2026-10-04'),
      // left out: neither in the figures nor in the way of the streak
      { ...complete('2026-10-05'), alcoholDay: true },
      complete('2026-10-06'),
    ])
    vi.mocked(fetchWeights).mockResolvedValue([
      { date: '2026-09-28', weightKg: 90 },
      { date: '2026-10-02', weightKg: 80 },
      { date: '2026-10-12', weightKg: 78.8 },
    ])
    renderPage()

    const highlights = await screen.findByTestId('month-highlights')
    await waitFor(() => expect(highlights).toHaveTextContent('4 of 5 days within goal'))
    expect(highlights).toHaveTextContent('Longest streak 3 days')
    expect(highlights).toHaveTextContent('Weight −1.2 kg')
  })

  test('leaves out the streak and the weight change when there is none', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([{ ...complete('2026-10-02'), kcal: 2600 }])
    renderPage()

    const highlights = await screen.findByTestId('month-highlights')
    await waitFor(() => expect(highlights).toHaveTextContent('0 of 1 day within goal'))
    expect(highlights).not.toHaveTextContent('streak')
    expect(highlights).not.toHaveTextContent('Weight')
  })

  test('a filter fades the days that do not match and survives opening a day', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([
      complete('2026-10-01'),
      { ...complete('2026-10-02'), alcoholDay: true },
    ])
    const user = userEvent.setup()
    renderPage()
    const alcohol = await screen.findByRole('button', { name: 'Alcohol' })
    expect(alcohol).toHaveAttribute('aria-pressed', 'false')

    await user.click(alcohol)

    expect(screen.getByRole('button', { name: 'Alcohol' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^October 1,/ })).toHaveAttribute(
      'data-faded',
      'true',
    )
    expect(screen.getByRole('button', { name: /^October 2,/ })).not.toHaveAttribute('data-faded')

    // the page mounts again for another address: the filter rides along
    await user.click(screen.getByRole('button', { name: /^October 2,/ }))
    expect(screen.getByTestId('path')).toHaveTextContent('/history/2026-10-02')
    expect(screen.getByRole('button', { name: 'Alcohol' })).toHaveAttribute('aria-pressed', 'true')

    // one at a time, and tapping the active one clears it
    await user.click(screen.getByRole('button', { name: 'Notes' }))
    expect(screen.getByRole('button', { name: 'Alcohol' })).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('button', { name: 'Notes' }))
    expect(screen.getByRole('button', { name: 'Notes' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /^October 1,/ })).not.toHaveAttribute('data-faded')
  })

  test('the Notes filter keeps the days with a note', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([complete('2026-10-01'), complete('2026-10-02')])
    vi.mocked(fetchMonthNotes).mockResolvedValue([
      { date: '2026-10-02', mealType: null, text: 'Hike' },
    ])
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Notes' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^October 1,/ })).toHaveAttribute('data-faded'),
    )
    expect(screen.getByRole('button', { name: /^October 2,/ })).not.toHaveAttribute('data-faded')
  })

  test('fades nothing for the Notes filter while the notes are loading', async () => {
    vi.mocked(fetchMonthNotes).mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Notes' }))
    await screen.findByText(/days? logged/)

    expect(screen.getByRole('button', { name: /^October 1,/ })).not.toHaveAttribute('data-faded')
  })

  test('fades nothing for a totals filter while the month totals are loading', async () => {
    vi.mocked(fetchDailyTotals).mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Missing' }))

    expect(screen.getByRole('button', { name: /^October 1\b/ })).not.toHaveAttribute('data-faded')
  })

  test('shows an error instead of the notes list, and fades nothing, when the notes fail', async () => {
    vi.mocked(fetchMonthNotes).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Notes' }))

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

    await user.click(await screen.findByRole('button', { name: 'Cheat' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^October 1,/ })).toHaveAttribute('data-faded'),
    )
    expect(screen.getByRole('button', { name: /^October 2,/ })).not.toHaveAttribute('data-faded')
  })

  test('does not fade the open day', async () => {
    vi.mocked(fetchDailyTotals).mockResolvedValue([complete('2026-10-01'), complete('2026-10-02')])
    const user = userEvent.setup()
    renderPage('/history/2026-10-01')

    await user.click(await screen.findByRole('button', { name: 'Alcohol' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^October 2,/ })).toHaveAttribute('data-faded'),
    )
    expect(screen.getByRole('button', { name: /^October 1,/ })).not.toHaveAttribute('data-faded')
  })

  test('opening a day from outside takes the filter of that navigation, none when absent', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Alcohol' }))
    expect(screen.getByRole('button', { name: 'Alcohol' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Open partner’s day' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Alcohol' })).toHaveAttribute(
        'aria-pressed',
        'false',
      ),
    )
  })

  test('lists the notes of the month and a tap opens that day', async () => {
    vi.mocked(fetchMonthNotes).mockResolvedValue([
      { date: '2026-10-12', mealType: null, text: 'Birthday at Oma’s' },
      { date: '2026-10-12', mealType: 'dinner', text: 'Pizza' },
    ])
    const user = userEvent.setup()
    renderPage()

    const list = await screen.findByRole('region', { name: 'Notes of the month' })
    expect(within(list).getByText('Birthday at Oma’s')).toBeInTheDocument()
    expect(within(list).getByText('Dinner · Pizza')).toBeInTheDocument()

    expect(within(list).getByRole('list')).toBeInTheDocument()
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)

    await user.click(within(list).getByRole('button', { name: /Pizza/ }))
    expect(screen.getByTestId('path')).toHaveTextContent('/history/2026-10-12')
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1))
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole('region', { name: /October 12/ }))

    // the day is open already: tapping again keeps it open
    await user.click(
      within(screen.getByRole('region', { name: 'Notes of the month' })).getByRole('button', {
        name: /Pizza/,
      }),
    )
    expect(screen.getByTestId('path')).toHaveTextContent('/history/2026-10-12')
    // and it scrolls to the open day again, as feedback
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(2))
  })

  test('shows no list without notes', async () => {
    renderPage()

    await screen.findByTestId('month-summary')
    expect(screen.queryByRole('region', { name: 'Notes of the month' })).not.toBeInTheDocument()
  })
})
