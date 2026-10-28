import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'

vi.mock('../goals/goalsApi', () => ({ fetchGoals: vi.fn(), saveGoal: vi.fn() }))
vi.mock('../weight/weightApi', () => ({
  fetchWeights: vi.fn(),
  saveWeight: vi.fn(),
  deleteWeight: vi.fn(),
}))
vi.mock('./trendsApi', () => ({ fetchNutritionDays: vi.fn() }))

import { fetchGoals } from '../goals/goalsApi'
import type { Goal } from '../nutrition/goals'
import { fetchWeights, saveWeight } from '../weight/weightApi'
import type { NutritionDay } from './trends'
import { fetchNutritionDays } from './trendsApi'
import { TrendsView } from './TrendsView'

const TODAY = '2026-10-08'
const GOAL: Goal = {
  validFrom: '2026-01-01',
  kcal: 2000,
  proteinG: 120,
  carbsG: null,
  fatG: null,
  kcalBurned: null,
  fiberG: null,
  weightGoalKg: 68,
}

function day(date: string, kcal: number, estimated = false): NutritionDay {
  return { date, kcal, protein: 100, carbs: 0, fat: 0, fiber: 0, estimated, mealCount: 2 }
}

function renderTrends(isOwn = true) {
  return renderWithProviders(<TrendsView userId="u1" isOwn={isOwn} today={TODAY} />)
}

const chips = () =>
  within(screen.getByRole('group', { name: 'Show' }))
    .getAllByRole('button')
    .map((chip) => chip.textContent)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchGoals).mockResolvedValue([GOAL])
  vi.mocked(fetchWeights).mockResolvedValue([
    { date: '2026-09-01', weightKg: 73 },
    { date: '2026-10-05', weightKg: 71.9 },
  ])
  vi.mocked(fetchNutritionDays).mockResolvedValue([
    day('2026-08-20', 2300),
    day('2026-10-01', 1800),
    day('2026-10-02', 2200, true),
  ])
  vi.mocked(saveWeight).mockResolvedValue()
})

describe('TrendsView', () => {
  test('offers calories, the nutrients with a goal, and weight', async () => {
    renderTrends()

    await waitFor(() => expect(chips()).toEqual(['Calories', 'Protein', 'Weight']))
    expect(screen.getByRole('button', { name: 'Calories' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('calories: a bar per logged day of the last 4 weeks, with figures', async () => {
    const user = userEvent.setup()
    renderTrends()
    await user.click(await screen.findByRole('radio', { name: '4 wks' }))

    const chart = await screen.findByRole('region', { name: 'Calories chart' })
    expect(within(chart).getAllByTestId('trend-bar')).toHaveLength(2)
    expect(within(chart).getByTestId('goal-line')).toBeInTheDocument()
    expect(fetchNutritionDays).toHaveBeenCalledWith('u1', '2026-08-14', TODAY)
    const stats = screen.getByTestId('trend-stats')
    expect(stats).toHaveTextContent('Ø per day2,000 kcal')
    expect(stats).toHaveTextContent('Within goal2 of 2')
    expect(stats).toHaveTextContent('vs. previous−300 kcal4 weeks')
  })

  test('the table behind the chart lists every bar for VoiceOver', async () => {
    const user = userEvent.setup()
    renderTrends()
    await user.click(await screen.findByRole('radio', { name: '4 wks' }))

    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(2)
    expect(table).toHaveTextContent('2,200 kcal')
  })

  test('it opens on the current calendar week, Monday to Sunday', async () => {
    vi.mocked(fetchNutritionDays).mockResolvedValue([
      day('2026-10-02', 2400),
      day('2026-10-06', 1900),
    ])
    renderTrends()

    const chart = await screen.findByRole('region', { name: 'Calories chart' })
    expect(screen.getByRole('radio', { name: 'Week' })).toBeChecked()
    // this week and last week, in one request
    expect(fetchNutritionDays).toHaveBeenCalledWith('u1', '2026-09-28', '2026-10-11')
    expect(within(chart).getAllByTestId('trend-bar')).toHaveLength(1)
    expect(screen.getByTestId('trend-stats')).toHaveTextContent('vs. previous−500 kcalweek')
  })

  test("days that don't count: a ghost bar for a cheat day, grey for a missing meal and today", async () => {
    vi.mocked(fetchNutritionDays).mockResolvedValue([
      day('2026-10-05', 1800),
      { ...day('2026-10-06', 3500), cheatDay: true },
      { ...day('2026-10-07', 700), dinnerLogged: false },
      { ...day(TODAY, 400), dinnerLogged: false },
    ])
    renderTrends()

    const chart = await screen.findByRole('region', { name: 'Calories chart' })
    const bars = within(chart).getAllByTestId('trend-bar')
    expect(bars.map((bar) => bar.getAttribute('data-kind'))).toEqual([
      'counted',
      'cheatDay',
      'missing',
      'today',
    ])
    // the cheat day stands as high as its goal, not its 3,500 kcal
    const yIn = (pattern: RegExp, element: Element) =>
      Number(pattern.exec(element.getAttribute('d') ?? '')?.[1])
    const goalY = yIn(/M[\d.]+,([\d.]+)/, within(chart).getByTestId('goal-line'))
    expect(yIn(/Q[\d.]+,([\d.]+)/, bars[1]!)).toBeCloseTo(goalY, 1)
    expect(screen.getByTestId('trend-stats')).toHaveTextContent('Ø per day1,800 kcal')
    expect(screen.getByTestId('trend-stats')).toHaveTextContent('Within goal1 of 1')
    const table = within(chart).getByRole('table')
    expect(table).toHaveTextContent('cheat day · not counted')
  })

  test('tapping a day that does not count says why', async () => {
    vi.mocked(fetchNutritionDays).mockResolvedValue([
      { ...day('2026-10-06', 3500), cheatMeal: true },
      { ...day('2026-10-07', 700), lunchLogged: false },
    ])
    renderTrends()
    const chart = await screen.findByRole('region', { name: 'Calories chart' })
    const targets = () =>
      within(chart)
        .getAllByTestId('trend-bar')
        .map((bar) => bar.nextElementSibling as Element)

    fireEvent.click(targets()[0]!)
    expect(chart).toHaveTextContent('cheat meal · not counted')
    fireEvent.click(targets()[1]!)
    expect(chart).toHaveTextContent('700 kcal · lunch or dinner missing · not counted')
  })

  test('an alcohol day is a ghost bar of its own and says so when tapped', async () => {
    vi.mocked(fetchNutritionDays).mockResolvedValue([
      day('2026-10-05', 1800),
      { ...day('2026-10-06', 0), mealCount: 0, alcoholDay: true },
    ])
    renderTrends()
    const chart = await screen.findByRole('region', { name: 'Calories chart' })

    const bars = within(chart).getAllByTestId('trend-bar')
    expect(bars.map((bar) => bar.getAttribute('data-kind'))).toEqual(['counted', 'alcoholDay'])
    expect(within(chart).getByRole('table')).toHaveTextContent('alcohol day · not counted')
    expect(screen.getByTestId('trend-stats')).toHaveTextContent('Ø per day1,800 kcal')
  })

  test('the Week view steps back to an earlier week with an entry, compared with the one before', async () => {
    const user = userEvent.setup()
    // TODAY is Thursday, October 8: this week is October 5 – 11
    vi.mocked(fetchNutritionDays).mockResolvedValue([day('2026-09-16', 1900)])
    renderTrends()

    const earlier = await screen.findByRole('button', { name: 'Earlier week' })
    await waitFor(() => expect(earlier).toBeEnabled())
    await user.click(earlier)

    // the empty weeks in between are skipped
    expect(screen.getByRole('button', { name: /Week 38/ })).toBeInTheDocument()
    expect(fetchNutritionDays).toHaveBeenCalledWith('u1', '2026-09-07', '2026-09-20')
    const chart = await screen.findByRole('region', { name: 'Calories chart' })
    await waitFor(() => expect(within(chart).getAllByTestId('trend-bar')).toHaveLength(1))

    // another range starts again from this week
    await user.click(screen.getByRole('radio', { name: '4 wks' }))
    await user.click(screen.getByRole('radio', { name: 'Week' }))
    expect(screen.getByRole('button', { name: /Week 41/ })).toHaveTextContent('This week')
  })

  test('a longer range asks for more days', async () => {
    const user = userEvent.setup()
    renderTrends()
    await screen.findByRole('region', { name: 'Calories chart' })

    await user.click(screen.getByRole('radio', { name: '3 mo' }))

    await waitFor(() =>
      expect(fetchNutritionDays).toHaveBeenLastCalledWith('u1', '2026-04-10', TODAY),
    )
  })

  test('weight: the line, current weight, change and the distance to the goal', async () => {
    const user = userEvent.setup()
    renderTrends()
    await user.click(await screen.findByRole('radio', { name: '4 wks' }))

    await user.click(await screen.findByRole('button', { name: 'Weight' }))

    const chart = await screen.findByRole('region', { name: 'Weight chart' })
    // the weight carried in from September, then the entry of Oct 5
    expect(within(chart).getAllByTestId('weight-dot')).toHaveLength(2)
    expect(within(chart).getByTestId('goal-line')).toBeInTheDocument()
    const stats = screen.getByTestId('trend-stats')
    expect(stats).toHaveTextContent('Current71.9 kg')
    expect(stats).toHaveTextContent('Change−1.1 kg')
    expect(stats).toHaveTextContent('To goal3.9 kgto lose')
  })

  test('the weight chart has a table of its values and the target for VoiceOver', async () => {
    const user = userEvent.setup()
    renderTrends()

    await user.click(await screen.findByRole('button', { name: 'Weight' }))

    const table = await screen.findByRole('table')
    expect(table).toHaveTextContent('71.9 kg')
    expect(table).toHaveTextContent('Target68.0 kg')
  })

  test('goals cached by an older version (no target weight yet) still work', async () => {
    const { weightGoalKg: _, fiberG: __, ...old } = GOAL
    vi.mocked(fetchGoals).mockResolvedValue([old as Goal])
    renderTrends()

    await waitFor(() => expect(chips()).toEqual(['Calories', 'Protein', 'Weight']))
  })

  test('a weight can be added for any day', async () => {
    const user = userEvent.setup()
    renderTrends()
    await user.click(await screen.findByRole('button', { name: 'Weight' }))

    await user.click(await screen.findByRole('button', { name: 'Add weight' }))
    const sheet = within(screen.getByRole('dialog', { name: 'Weight' }))
    // a future day is ignored, an earlier one taken
    fireEvent.change(sheet.getByLabelText('Day'), { target: { value: '2026-10-09' } })
    expect(sheet.getByLabelText('Day')).toHaveValue(TODAY)
    fireEvent.change(sheet.getByLabelText('Day'), { target: { value: '2026-10-06' } })
    await user.clear(sheet.getByLabelText('Weight'))
    await user.type(sheet.getByLabelText('Weight'), '71,5')
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    expect(saveWeight).toHaveBeenCalledWith('u1', { date: '2026-10-06', weightKg: 71.5 })
  })

  test('a partner’s weight is shown, but can’t be changed', async () => {
    const user = userEvent.setup()
    renderTrends(false)

    await user.click(await screen.findByRole('button', { name: 'Weight' }))

    expect(await screen.findByRole('region', { name: 'Weight chart' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add weight' })).not.toBeInTheDocument()
  })
})
