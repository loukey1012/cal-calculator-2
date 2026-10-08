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
    renderTrends()

    const chart = await screen.findByRole('region', { name: 'Calories chart' })
    expect(within(chart).getAllByTestId('trend-bar')).toHaveLength(2)
    expect(within(chart).getByTestId('goal-line')).toBeInTheDocument()
    expect(fetchNutritionDays).toHaveBeenCalledWith('u1', '2026-08-14', TODAY)
    const stats = screen.getByTestId('trend-stats')
    expect(stats).toHaveTextContent('Ø per day2,000 kcal')
    expect(stats).toHaveTextContent('Within goal1 of 2')
    expect(stats).toHaveTextContent('vs. previous−300 kcal4 weeks')
  })

  test('the table behind the chart lists every bar for VoiceOver', async () => {
    renderTrends()

    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(2)
    expect(table).toHaveTextContent('2,200 kcal')
  })

  test('a longer range asks for more days', async () => {
    const user = userEvent.setup()
    renderTrends()
    await screen.findByRole('region', { name: 'Calories chart' })

    await user.click(screen.getByRole('radio', { name: '3 months' }))

    await waitFor(() =>
      expect(fetchNutritionDays).toHaveBeenLastCalledWith('u1', '2026-04-10', TODAY),
    )
  })

  test('weight: the line, current weight, change and the distance to the goal', async () => {
    const user = userEvent.setup()
    renderTrends()

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
