import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'

vi.mock('../meals/mealsApi', () => ({
  fetchDay: vi.fn(),
  fetchCheatDay: vi.fn(),
  setCheatMeal: vi.fn(),
  setCheatDay: vi.fn(),
}))

import { fetchDay, fetchCheatDay, setCheatMeal, setCheatDay } from '../meals/mealsApi'
import type { MealType } from '../meals/dayModel'
import { dayMeal, mealItem } from '../meals/testData'
import { DayOptionsSheet } from './DayOptionsSheet'

// a small server: what was saved is what the next fetch returns
let cheatDayOnServer = false
let cheatMealsOnServer = new Set<MealType>(['dinner'])

beforeEach(() => {
  vi.clearAllMocks()
  cheatDayOnServer = false
  cheatMealsOnServer = new Set(['dinner'])
  vi.mocked(fetchDay).mockImplementation(async () => [
    { ...dayMeal('m1', 'dinner', []), cheat_meal: cheatMealsOnServer.has('dinner') },
    {
      ...dayMeal('m2', 'lunch', [mealItem({ id: 'pasta' })]),
      cheat_meal: cheatMealsOnServer.has('lunch'),
    },
  ])
  vi.mocked(fetchCheatDay).mockImplementation(async () => cheatDayOnServer)
  vi.mocked(setCheatMeal).mockImplementation(async ({ mealType, cheatMeal }) => {
    cheatMealsOnServer = new Set(
      cheatMeal
        ? [...cheatMealsOnServer, mealType]
        : [...cheatMealsOnServer].filter((type) => type !== mealType),
    )
  })
  vi.mocked(setCheatDay).mockImplementation(async (_userId, _date, cheatDay) => {
    cheatDayOnServer = cheatDay
  })
})

function renderSheet() {
  const onClose = vi.fn()
  renderWithProviders(<DayOptionsSheet open userId="u1" date="2026-10-02" onClose={onClose} />)
  return { onClose }
}

const switchNamed = (name: string) => screen.getByRole('switch', { name })

describe('DayOptionsSheet', () => {
  test('shows whether it is a cheat day and which meals were cheat meals', async () => {
    renderSheet()

    await waitFor(() => expect(switchNamed('Dinner')).toHaveAttribute('aria-checked', 'true'))
    expect(switchNamed('Cheat day')).toHaveAttribute('aria-checked', 'false')
    expect(switchNamed('Breakfast')).toHaveAttribute('aria-checked', 'false')
    expect(switchNamed('Lunch')).toHaveAttribute('aria-checked', 'false')
    expect(switchNamed('Snacks')).toHaveAttribute('aria-checked', 'false')
  })

  test('marks the day as a cheat day and saves it', async () => {
    const user = userEvent.setup()
    renderSheet()
    await waitFor(() => expect(fetchCheatDay).toHaveBeenCalledWith('u1', '2026-10-02'))

    await user.click(switchNamed('Cheat day'))

    await waitFor(() => expect(switchNamed('Cheat day')).toHaveAttribute('aria-checked', 'true'))
    await waitFor(() => expect(setCheatDay).toHaveBeenCalledWith('u1', '2026-10-02', true))
  })

  test('marks a meal as a cheat meal, or takes the mark back', async () => {
    const user = userEvent.setup()
    renderSheet()
    await waitFor(() => expect(switchNamed('Dinner')).toHaveAttribute('aria-checked', 'true'))

    await user.click(switchNamed('Lunch'))
    await user.click(switchNamed('Dinner'))

    await waitFor(() => expect(switchNamed('Lunch')).toHaveAttribute('aria-checked', 'true'))
    await waitFor(() => expect(switchNamed('Dinner')).toHaveAttribute('aria-checked', 'false'))
    await waitFor(() => expect(setCheatMeal).toHaveBeenCalledTimes(2))
    expect(setCheatMeal).toHaveBeenNthCalledWith(1, {
      userId: 'u1',
      date: '2026-10-02',
      mealType: 'lunch',
      cheatMeal: true,
    })
    expect(setCheatMeal).toHaveBeenNthCalledWith(2, {
      userId: 'u1',
      date: '2026-10-02',
      mealType: 'dinner',
      cheatMeal: false,
    })
  })

  test('switches save on their own: Close just closes', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSheet()

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalled()
  })
})
