import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../../app/currentUser'
import { renderWithProviders } from '../../../test/render'

vi.mock('../historyApi', () => ({
  fetchDailyTotals: vi.fn(),
  fetchMonthNotes: vi.fn().mockResolvedValue([]),
}))
vi.mock('./weekApi', () => ({ fetchWeekData: vi.fn() }))
vi.mock('../../goals/goalsApi', () => ({ fetchGoals: vi.fn(), saveGoal: vi.fn() }))
vi.mock('../../household/householdApi', () => ({ fetchMembers: vi.fn() }))

import { fetchGoals } from '../../goals/goalsApi'
import { fetchMembers } from '../../household/householdApi'
import { fetchDailyTotals } from '../historyApi'
import { fetchWeekData } from './weekApi'
import type { WeekData } from './weekApi'
import type { WeekDay } from './weekStats'
import { WeekRoute } from './WeekPage'
import { weekPageOf } from './weekPages'

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
  validFrom: '2026-10-01',
  kcal: 2000,
  kcalBurned: 2600,
  proteinG: 100,
  carbsG: null,
  fatG: null,
  fiberG: null,
  weightGoalKg: null,
}

function day(date: string, kcal: number, overrides: Partial<WeekDay> = {}): WeekDay {
  return {
    date,
    kcal,
    protein: 80,
    carbs: 200,
    fat: 60,
    fiber: 20,
    mealCount: 3,
    kcalEstimated: false,
    cheatDay: false,
    cheatMeal: false,
    alcoholDay: false,
    lunchLogged: true,
    dinnerLogged: true,
    ...overrides,
  }
}

// week 43: three counted days (5,900 kcal), an alcohol day, a missing dinner, a cheat day, nothing
const WEEK_43: WeekData = {
  days: [
    day('2026-10-19', 2000),
    day('2026-10-20', 1800),
    day('2026-10-21', 2100),
    day('2026-10-22', 9000, { alcoholDay: true }),
    day('2026-10-23', 300, { dinnerLogged: false }),
    day('2026-10-24', 7000, { cheatDay: true }),
  ],
  meals: [
    { date: '2026-10-19', mealType: 'lunch', kcal: 900 },
    { date: '2026-10-20', mealType: 'lunch', kcal: 600 },
    { date: '2026-10-21', mealType: 'lunch', kcal: 600 },
    { date: '2026-10-22', mealType: 'lunch', kcal: 6000 },
  ],
  foods: [
    { date: '2026-10-19', name: 'Oats' },
    { date: '2026-10-20', name: 'Oats' },
    { date: '2026-10-21', name: 'Oats' },
    { date: '2026-10-19', name: 'Apple' },
    { date: '2026-10-20', name: 'Apple' },
    { date: '2026-10-22', name: 'Beer' },
    { date: '2026-10-23', name: 'Beer' },
    { date: '2026-10-24', name: 'Beer' },
  ],
  notes: [
    { date: '2026-10-21', mealType: null, text: 'Long hike' },
    { date: '2026-10-22', mealType: 'dinner', text: 'Wine with friends' },
  ],
}

// week 44 is the running one (today is Wednesday, October 28)
const WEEK_44: WeekData = {
  days: [day('2026-10-26', 2000), day('2026-10-27', 1900), day('2026-10-28', 700)],
  meals: [],
  foods: [],
  notes: [],
}

const SINCE_START = [
  day('2026-10-12', 2400),
  ...WEEK_43.days,
  day('2026-10-26', 2000),
  day('2026-10-27', 1900),
]

function LocationProbe() {
  const { pathname, state } = useLocation()
  return (
    <>
      <p data-testid="path">{pathname}</p>
      <p data-testid="state">{JSON.stringify(state)}</p>
    </>
  )
}

/** Like the page stack: a new address is a new page. */
function Routed() {
  const { pathname } = useLocation()
  const week = weekPageOf(pathname, '2026-10-28')
  return week ? <WeekRoute week={week} key={pathname} /> : null
}

function renderWeek(path: string, state: unknown = { person: 'u1' }) {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: PROFILE, householdId: 'h1' }}>
      <Routed />
      <LocationProbe />
    </CurrentUserContext>,
    { route: path, state },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 28, 12, 0))
  vi.mocked(fetchGoals).mockResolvedValue([GOAL])
  vi.mocked(fetchMembers).mockResolvedValue([PROFILE, PARTNER])
  vi.mocked(fetchDailyTotals).mockResolvedValue(SINCE_START)
  vi.mocked(fetchWeekData).mockImplementation(async (_user, first) =>
    first === '2026-10-26'
      ? WEEK_44
      : first === '2026-10-19'
        ? WEEK_43
        : { days: [], meals: [], foods: [], notes: [] },
  )
})

afterEach(() => {
  vi.useRealTimers()
})

describe('WeekPage header', () => {
  test('shows the week number, its dates and a way back to History', async () => {
    renderWeek('/history/week-2026-43')

    expect(await screen.findByRole('heading', { level: 1, name: 'Week 43' })).toBeInTheDocument()
    expect(screen.getByText('Mon, Oct 19 – Sun, Oct 25')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toHaveTextContent('‹ History')
  })

  test('Back returns to History and keeps the navigation state', async () => {
    const user = userEvent.setup()
    renderWeek('/history/week-2026-43', { person: 'u2', month: '2026-09-01' })

    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByTestId('path')).toHaveTextContent(/^\/history$/)
    expect(screen.getByTestId('state')).toHaveTextContent('"month":"2026-09-01"')
  })

  test('Back returns to the History address the week was opened from, with its state', async () => {
    const user = userEvent.setup()
    renderWeek('/history/week-2026-43', {
      person: 'u1',
      month: '2026-10-01',
      view: 'calendar',
      weekOrigin: '/history/2026-10-27',
    })

    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByTestId('path')).toHaveTextContent('/history/2026-10-27')
    expect(screen.getByTestId('state')).toHaveTextContent('"month":"2026-10-01"')
  })

  test('the arrows keep the origin for Back', async () => {
    const user = userEvent.setup()
    renderWeek('/history/week-2026-44', { person: 'u1', weekOrigin: '/history/2026-10-27' })

    await user.click(screen.getByRole('button', { name: 'Previous week' }))
    await screen.findByRole('heading', { level: 1, name: 'Week 43' })
    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByTestId('path')).toHaveTextContent('/history/2026-10-27')
  })

  test('the running week is called This week, and has no next week', async () => {
    renderWeek('/history/week-2026-44')

    expect(await screen.findByRole('heading', { level: 1, name: 'This week' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next week' })).toBeDisabled()
  })

  test('steps to the previous and the next week', async () => {
    const user = userEvent.setup()
    renderWeek('/history/week-2026-44')

    await user.click(screen.getByRole('button', { name: 'Previous week' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/history/week-2026-43')
    expect(await screen.findByRole('heading', { level: 1, name: 'Week 43' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next week' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/history/week-2026-44')
  })
})

describe('saved card', () => {
  test('adds up burned minus eaten over the counted days only', async () => {
    renderWeek('/history/week-2026-43')

    const card = await screen.findByRole('region', { name: 'Saved this week' })
    // burned 3 × 2,600, ate 2,000 + 1,800 + 2,100; the alcohol, cheat and incomplete days are out
    expect(within(card).getByText('1,900 kcal')).toBeInTheDocument()
    expect(within(card).getByText('Burned 7,800 · ate 5,900 · 3 counted days')).toBeInTheDocument()
  })

  test('shows the running total since tracking started', async () => {
    renderWeek('/history/week-2026-43')

    const card = await screen.findByRole('region', { name: 'Saved this week' })
    // October 12 adds 200 to the 1,900 of this week, October 26 and 27 add 600 and 700
    expect(await within(card).findByText('3,400 kcal')).toBeInTheDocument()
    expect(within(card).getByText(/saved since Oct 10/)).toBeInTheDocument()
  })

  test('calls more eaten than burned a surplus', async () => {
    vi.mocked(fetchGoals).mockResolvedValue([{ ...GOAL, kcalBurned: 1500 }])
    renderWeek('/history/week-2026-43')

    const card = await screen.findByRole('region', { name: 'Saved this week' })
    expect(within(card).getByText('1,400 kcal surplus')).toBeInTheDocument()
  })

  test('without a burned figure it points to Settings instead of showing numbers', async () => {
    vi.mocked(fetchGoals).mockResolvedValue([{ ...GOAL, kcalBurned: null }])
    renderWeek('/history/week-2026-43')

    const card = await screen.findByRole('region', { name: 'Saved this week' })
    expect(
      within(card).getByText('Set your calories burned in Settings › Goals to see calories saved'),
    ).toBeInTheDocument()
    expect(within(card).queryByText(/Burned/)).not.toBeInTheDocument()
    expect(within(card).queryByText(/saved since/)).not.toBeInTheDocument()
  })

  test('the partner sees that nothing is set, not a pointer to their own Settings', async () => {
    vi.mocked(fetchGoals).mockResolvedValue([{ ...GOAL, kcalBurned: null }])
    renderWeek('/history/week-2026-43', { person: 'u2' })

    expect(await screen.findByText('No calories burned are set for baby.')).toBeInTheDocument()
  })

  test('the running week says so, and gives the days left and the calories a day', async () => {
    renderWeek('/history/week-2026-44')

    const card = await screen.findByRole('region', { name: 'Saved so far' })
    // 2 counted days (Mon, Tue): burned 5,200, ate 3,900; today is not over yet
    expect(within(card).getByText('1,300 kcal')).toBeInTheDocument()
    expect(within(card).getByText('5 days left')).toBeInTheDocument()
    // (2,000 × (2 + 5) − 3,900) / 5
    expect(
      within(card).getByText('Up to 2,020 kcal a day keeps this week within goal'),
    ).toBeInTheDocument()
  })

  test('says that today is not in the budget yet', async () => {
    renderWeek('/history/week-2026-44')

    const card = await screen.findByRole('region', { name: 'Saved so far' })
    expect(within(card).getByText('Today counts once it’s over')).toBeInTheDocument()
  })

  test('takes the goal of each counted day, and today’s for the days left', async () => {
    vi.mocked(fetchGoals).mockResolvedValue([
      GOAL,
      { ...GOAL, validFrom: '2026-10-27', kcal: 2400 },
    ])
    renderWeek('/history/week-2026-44')

    const card = await screen.findByRole('region', { name: 'Saved so far' })
    // (2,000 + 2,400 + 5 × 2,400 − 3,900) / 5
    expect(
      within(card).getByText('Up to 2,500 kcal a day keeps this week within goal'),
    ).toBeInTheDocument()
  })

  test('says how many counted days have no calories burned', async () => {
    vi.mocked(fetchGoals).mockResolvedValue([
      { ...GOAL, validFrom: '2026-10-01', kcalBurned: null },
      { ...GOAL, validFrom: '2026-10-21', kcalBurned: 2600 },
    ])
    renderWeek('/history/week-2026-43')

    const card = await screen.findByRole('region', { name: 'Saved this week' })
    expect(
      within(card).getByText(
        'Burned 2,600 · ate 2,100 · 1 of 3 counted days (2 without calories burned)',
      ),
    ).toBeInTheDocument()
  })

  test('a past week has no days left', async () => {
    renderWeek('/history/week-2026-43')

    await screen.findByRole('region', { name: 'Saved this week' })
    expect(screen.queryByText(/days left/)).not.toBeInTheDocument()
  })

  test('a failed running total shows its error', async () => {
    vi.mocked(fetchDailyTotals).mockRejectedValue(new Error('offline'))
    renderWeek('/history/week-2026-43')

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})

describe('while the goals load', () => {
  test('shows a loading state, never the text that no calories burned are set', async () => {
    vi.mocked(fetchGoals).mockReturnValue(new Promise(() => {}))
    renderWeek('/history/week-2026-43')

    expect(await screen.findByRole('status')).toHaveTextContent('Loading…')
    await waitFor(() => expect(fetchWeekData).toHaveBeenCalled())
    expect(screen.queryByText(/Set your calories burned/)).not.toBeInTheDocument()
    expect(screen.queryByText(/No calories burned are set/)).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Days of the week' })).not.toBeInTheDocument()
  })

  test('a failed goals read shows the error above the week, without a false "not set"', async () => {
    vi.mocked(fetchGoals).mockRejectedValue(new Error('offline'))
    renderWeek('/history/week-2026-43')

    const alert = await screen.findByRole('alert')
    const strip = await screen.findByRole('list', { name: 'Days of the week' })
    expect(alert.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByText(/Set your calories burned/)).not.toBeInTheDocument()
    expect(screen.queryByText(/No calories burned are set/)).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Saved this week' })).not.toBeInTheDocument()
  })
})

describe('stepping between weeks', () => {
  test('the new week shows in the header while the previous body stays, dimmed', async () => {
    const user = userEvent.setup()
    let release: (data: WeekData) => void = () => {}
    renderWeek('/history/week-2026-43')
    await screen.findByRole('region', { name: 'Saved this week' })
    vi.mocked(fetchWeekData).mockImplementation(
      () => new Promise<WeekData>((resolve) => (release = resolve)),
    )

    await user.click(screen.getByRole('button', { name: 'Next week' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'This week' })).toBeInTheDocument()
    expect(screen.getByText('Mon, Oct 26 – Sun, Nov 1')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    const old = screen.getByRole('region', { name: 'Saved this week' })
    expect(old.closest('[aria-busy="true"]')).not.toBeNull()
    release(WEEK_44)
    expect(await screen.findByRole('region', { name: 'Saved so far' })).toBeInTheDocument()
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  test('a week with nothing cached yet just loads', async () => {
    renderWeek('/history/week-2026-43')

    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()
  })
})

describe('days of the week', () => {
  test('lists Monday to Sunday with their calories and status', async () => {
    renderWeek('/history/week-2026-43')

    const strip = await screen.findByRole('list', { name: 'Days of the week' })
    expect(within(strip).getAllByRole('listitem')).toHaveLength(7)
    expect(
      within(strip).getByRole('button', { name: 'Monday, October 19, within goal, 2,000 kcal' }),
    ).toHaveAttribute('data-status', 'onTarget')
    expect(within(strip).getByRole('button', { name: /October 24, cheat day$/ })).toHaveAttribute(
      'data-status',
      'cheatDay',
    )
    expect(within(strip).getByRole('button', { name: /October 22, alcohol day$/ })).toBeVisible()
  })

  test('says what counted', async () => {
    renderWeek('/history/week-2026-43')

    expect(
      await screen.findByText(
        '3 counted · 1 alcohol day · 1 cheat day · 1 dinner missing · 1 day without lunch and dinner',
      ),
    ).toBeInTheDocument()
  })

  test('tapping a day opens it in History, in the calendar of its month', async () => {
    const user = userEvent.setup()
    renderWeek('/history/week-2026-43', { person: 'u2' })

    await user.click(await screen.findByRole('button', { name: /October 20, within goal/ }))

    expect(screen.getByTestId('path')).toHaveTextContent('/history/2026-10-20')
    const state = JSON.parse(screen.getByTestId('state').textContent ?? '{}')
    expect(state).toMatchObject({
      person: 'u2',
      month: '2026-10-01',
      view: 'calendar',
      calendarZoom: 'month',
      scrollToDay: true,
    })
  })

  test('a day to come cannot be opened', async () => {
    renderWeek('/history/week-2026-44')

    expect(await screen.findByRole('button', { name: /October 29/ })).toBeDisabled()
  })
})

describe('averages', () => {
  test('averages the counted days against the goals', async () => {
    renderWeek('/history/week-2026-43')

    const card = await screen.findByRole('region', { name: 'Averages' })
    // (2,000 + 1,800 + 2,100) / 3
    expect(within(card).getByText('Ø 1,967 kcal of 2,000')).toBeInTheDocument()
    expect(within(card).getByText('3 of 3 within goal')).toBeInTheDocument()
    expect(within(card).getByText('Protein')).toBeInTheDocument()
    expect(within(card).getByText('Ø 80.0 g of 100.0 g')).toBeInTheDocument()
    // no goal for carbs, fat or fiber
    expect(within(card).queryByText('Carbs')).not.toBeInTheDocument()
  })
})

describe('averages with changing goals', () => {
  test('sets "of" to the average of the counted days’ own goals', async () => {
    vi.mocked(fetchGoals).mockResolvedValue([
      GOAL,
      { ...GOAL, validFrom: '2026-10-27', kcal: 2400 },
    ])
    renderWeek('/history/week-2026-44')

    const card = await screen.findByRole('region', { name: 'Averages' })
    // Monday 2,000 against 2,000, Tuesday 1,900 against 2,400: Ø 1,950 of 2,200
    expect(within(card).getByText('Ø 1,950 kcal of 2,200')).toBeInTheDocument()
  })
})

describe('highlights', () => {
  test('shows the highest and the lowest counted day, which open the day', async () => {
    const user = userEvent.setup()
    renderWeek('/history/week-2026-43')

    const highest = await screen.findByRole('button', { name: /Highest day/ })
    expect(highest).toHaveTextContent('2,100 kcal')
    expect(screen.getByRole('button', { name: /Lowest day/ })).toHaveTextContent('1,800 kcal')
    // the alcohol and cheat days, with far more, never take part
    expect(screen.queryByText(/9,000|7,000/)).not.toBeInTheDocument()

    await user.click(highest)

    expect(screen.getByTestId('path')).toHaveTextContent('/history/2026-10-21')
  })

  test('shows the average of each meal over the counted days', async () => {
    renderWeek('/history/week-2026-43')

    const section = await screen.findByRole('region', { name: 'Average per meal' })
    expect(within(section).getByText('Lunch').parentElement).toHaveTextContent('700 kcal')
    expect(within(section).getByText('Breakfast').parentElement).toHaveTextContent('0 kcal')
  })

  test('lists the foods eaten on most days, not those of days that do not count', async () => {
    renderWeek('/history/week-2026-43')

    const section = await screen.findByRole('region', { name: 'Most eaten' })
    const items = within(section).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Oats')
    expect(items[0]).toHaveTextContent('3 times')
    expect(items[1]).toHaveTextContent('Apple')
    expect(items[1]).toHaveTextContent('2 times')
    expect(within(section).queryByText('Beer')).not.toBeInTheDocument()
  })

  test('lists the notes of every day, and a tap opens the day', async () => {
    const user = userEvent.setup()
    renderWeek('/history/week-2026-43')

    const section = await screen.findByRole('region', { name: 'Notes' })
    expect(within(section).getByText('Long hike')).toBeInTheDocument()

    await user.click(within(section).getByText('Dinner · Wine with friends'))

    expect(screen.getByTestId('path')).toHaveTextContent('/history/2026-10-22')
  })
})

describe('states', () => {
  test('a week with nothing logged is calm', async () => {
    renderWeek('/history/week-2026-42')

    expect(await screen.findByText('Nothing logged this week')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Averages' })).not.toBeInTheDocument()
  })

  test('shows the person asked for', async () => {
    renderWeek('/history/week-2026-43', { person: 'u2' })

    await waitFor(() =>
      expect(fetchWeekData).toHaveBeenCalledWith('u2', '2026-10-19', '2026-10-25'),
    )
    expect(await screen.findByText('baby · Mon, Oct 19 – Sun, Oct 25')).toBeInTheDocument()
  })

  test('loading, then an error when the week cannot be read', async () => {
    vi.mocked(fetchWeekData).mockRejectedValue(new Error('offline'))
    renderWeek('/history/week-2026-43')

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Averages' })).not.toBeInTheDocument()
  })
})
