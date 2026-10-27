import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'

vi.mock('../meals/mealsApi', () => ({
  fetchDay: vi.fn(),
  fetchDayMark: vi.fn(),
  setCheatMeal: vi.fn(),
  setDayMark: vi.fn(),
  fetchDayNote: vi.fn(),
  setDayNote: vi.fn(),
  setMealNote: vi.fn(),
}))

import {
  fetchDay,
  fetchDayMark,
  fetchDayNote,
  setCheatMeal,
  setDayMark,
  setDayNote,
  setMealNote,
} from '../meals/mealsApi'
import type { MealType } from '../meals/dayModel'
import type { DayMark } from '../meals/mealsApi'
import { dayMeal, mealItem } from '../meals/testData'
import { DayOptionsSheet } from './DayOptionsSheet'

// a small server: what was saved is what the next fetch returns
let markOnServer: DayMark = null
let cheatMealsOnServer = new Set<MealType>(['dinner'])

beforeEach(() => {
  vi.clearAllMocks()
  markOnServer = null
  cheatMealsOnServer = new Set(['dinner'])
  vi.mocked(fetchDay).mockImplementation(async () => [
    {
      ...dayMeal('m1', 'dinner', []),
      cheat_meal: cheatMealsOnServer.has('dinner'),
      note: 'Pizza with colleagues',
    },
    {
      ...dayMeal('m2', 'lunch', [mealItem({ id: 'pasta' })]),
      cheat_meal: cheatMealsOnServer.has('lunch'),
    },
  ])
  vi.mocked(fetchDayMark).mockImplementation(async () => markOnServer)
  vi.mocked(fetchDayNote).mockResolvedValue('Birthday')
  vi.mocked(setDayNote).mockResolvedValue()
  vi.mocked(setMealNote).mockResolvedValue()
  vi.mocked(setCheatMeal).mockImplementation(async ({ mealType, cheatMeal }) => {
    cheatMealsOnServer = new Set(
      cheatMeal
        ? [...cheatMealsOnServer, mealType]
        : [...cheatMealsOnServer].filter((type) => type !== mealType),
    )
  })
  vi.mocked(setDayMark).mockImplementation(async (_userId, _date, mark) => {
    markOnServer = mark
  })
})

function renderSheet() {
  const onClose = vi.fn()
  renderWithProviders(<DayOptionsSheet open userId="u1" date="2026-10-02" onClose={onClose} />)
  return { onClose }
}

const switchNamed = (name: string) => screen.getByRole('switch', { name })
const radioNamed = (name: string) => screen.getByRole('radio', { name })

describe('DayOptionsSheet', () => {
  test('shows the day as neither, and which meals were cheat meals', async () => {
    renderSheet()

    await waitFor(() => expect(switchNamed('Dinner')).toHaveAttribute('aria-checked', 'true'))
    expect(radioNamed('None')).toBeChecked()
    expect(radioNamed('Cheat day')).not.toBeChecked()
    expect(radioNamed('Alcohol day')).not.toBeChecked()
    expect(switchNamed('Breakfast')).toHaveAttribute('aria-checked', 'false')
    expect(switchNamed('Lunch')).toHaveAttribute('aria-checked', 'false')
    expect(switchNamed('Snacks')).toHaveAttribute('aria-checked', 'false')
  })

  test('shows a day that is already an alcohol day', async () => {
    markOnServer = 'alcohol'
    renderSheet()

    await waitFor(() => expect(radioNamed('Alcohol day')).toBeChecked())
    expect(radioNamed('None')).not.toBeChecked()
  })

  test('the day mark can only be changed once it has loaded', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchDayMark).mockImplementation(() => new Promise(() => {}))
    renderSheet()

    await user.click(radioNamed('None'))
    await user.click(radioNamed('Alcohol day'))

    expect(radioNamed('Alcohol day')).toBeDisabled()
    expect(setDayMark).not.toHaveBeenCalled()
  })

  test('explains the marks to VoiceOver', async () => {
    renderSheet()

    expect(await screen.findByRole('radiogroup', { name: 'Day mark' })).toHaveAccessibleDescription(
      /calories are not known/,
    )
  })

  test('a mark that fails to save goes back to what it was', async () => {
    const user = userEvent.setup()
    vi.mocked(setDayMark).mockRejectedValue(new Error('offline'))
    renderSheet()
    await waitFor(() => expect(radioNamed('None')).toBeEnabled())

    await user.click(radioNamed('Alcohol day'))

    await waitFor(() => expect(radioNamed('None')).toBeChecked())
    expect(radioNamed('Alcohol day')).not.toBeChecked()
  })

  test('marks the day as a cheat day, switches it to an alcohol day, and clears it', async () => {
    const user = userEvent.setup()
    renderSheet()
    await waitFor(() => expect(radioNamed('None')).toBeEnabled())

    await user.click(radioNamed('Cheat day'))
    await waitFor(() => expect(radioNamed('Cheat day')).toBeChecked())
    await waitFor(() => expect(setDayMark).toHaveBeenLastCalledWith('u1', '2026-10-02', 'cheat'))

    await user.click(radioNamed('Alcohol day'))
    await waitFor(() => expect(radioNamed('Alcohol day')).toBeChecked())
    expect(radioNamed('Cheat day')).not.toBeChecked()
    await waitFor(() => expect(setDayMark).toHaveBeenLastCalledWith('u1', '2026-10-02', 'alcohol'))

    await user.click(radioNamed('None'))
    await waitFor(() => expect(radioNamed('None')).toBeChecked())
    await waitFor(() => expect(setDayMark).toHaveBeenLastCalledWith('u1', '2026-10-02', null))
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

  test('shows the notes of the day and its meals', async () => {
    renderSheet()

    expect(await screen.findByDisplayValue('Birthday')).toHaveAccessibleName('Day note')
    expect(await screen.findByDisplayValue('Pizza with colleagues')).toHaveAccessibleName(
      'Dinner note',
    )
    expect(screen.getByRole('textbox', { name: 'Lunch note' })).toHaveValue('')
    // each row says what it is for, also once it has a note
    expect(screen.getByText('Day', { selector: 'label' })).toBeVisible()
    expect(screen.getByText('Dinner', { selector: 'label' })).toBeVisible()
  })

  test('a note is saved when its field is left, only if it changed', async () => {
    const user = userEvent.setup()
    renderSheet()
    const lunch = screen.getByRole('textbox', { name: 'Lunch note' })
    await screen.findByDisplayValue('Birthday')

    await user.click(screen.getByRole('textbox', { name: 'Day note' }))
    await user.click(lunch)
    expect(setDayNote).not.toHaveBeenCalled()
    await user.type(lunch, 'Leftovers at work{Enter}')

    await waitFor(() =>
      expect(setMealNote).toHaveBeenCalledWith({
        userId: 'u1',
        date: '2026-10-02',
        mealType: 'lunch',
        note: 'Leftovers at work',
      }),
    )
  })

  test('clearing the day note removes it', async () => {
    const user = userEvent.setup()
    renderSheet()
    const day = await screen.findByDisplayValue('Birthday')

    await user.clear(day)
    await user.tab()

    await waitFor(() => expect(setDayNote).toHaveBeenCalledWith('u1', '2026-10-02', ''))
  })
})
