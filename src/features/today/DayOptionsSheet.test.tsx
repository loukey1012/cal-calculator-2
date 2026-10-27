import { fireEvent, screen, waitFor } from '@testing-library/react'
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
  vi.spyOn(window, 'confirm').mockReturnValue(true)
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
  const { queryClient } = renderWithProviders(
    <DayOptionsSheet open userId="u1" date="2026-10-02" onClose={onClose} />,
  )
  return { onClose, queryClient }
}

const switchNamed = (name: string) => screen.getByRole('switch', { name })
const radioNamed = (name: string) => screen.getByRole('radio', { name })
const saveButton = () => screen.getByRole('button', { name: 'Save' })
const closeButton = () => screen.getByRole('button', { name: 'Close' })

describe('DayOptionsSheet', () => {
  test('an edit taken back follows a change from the partner again', async () => {
    const user = userEvent.setup()
    const { queryClient } = renderSheet()
    await waitFor(() => expect(radioNamed('None')).toBeEnabled())
    await user.click(radioNamed('Cheat day'))
    await user.click(radioNamed('None'))

    markOnServer = 'alcohol'
    await queryClient.invalidateQueries()

    await waitFor(() => expect(radioNamed('Alcohol day')).toBeChecked())
    expect(saveButton()).toBeDisabled()
  })

  test('the notes can only be edited once the day note has loaded', async () => {
    vi.mocked(fetchDayNote).mockImplementation(() => new Promise(() => {}))
    renderSheet()

    expect(await screen.findByRole('textbox', { name: 'Day note' })).toBeDisabled()
  })

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
    expect(saveButton()).toBeDisabled()
    expect(setDayMark).not.toHaveBeenCalled()
  })

  test('explains the marks to VoiceOver', async () => {
    renderSheet()

    expect(await screen.findByRole('radiogroup', { name: 'Day mark' })).toHaveAccessibleDescription(
      /calories are not known/,
    )
  })

  test('Save is off while nothing is changed, and a change that is undone counts as none', async () => {
    const user = userEvent.setup()
    renderSheet()
    await waitFor(() => expect(radioNamed('None')).toBeEnabled())
    expect(saveButton()).toBeDisabled()

    await user.click(radioNamed('Cheat day'))
    expect(saveButton()).toBeEnabled()
    await user.click(radioNamed('None'))
    expect(saveButton()).toBeDisabled()

    await user.click(switchNamed('Lunch'))
    expect(saveButton()).toBeEnabled()
    await user.click(switchNamed('Lunch'))
    expect(saveButton()).toBeDisabled()
  })

  test('nothing is saved before Save is pressed', async () => {
    const user = userEvent.setup()
    renderSheet()
    await waitFor(() => expect(radioNamed('None')).toBeEnabled())

    await user.click(radioNamed('Alcohol day'))
    await user.click(switchNamed('Lunch'))
    await user.type(screen.getByRole('textbox', { name: 'Day note' }), ' party')
    await user.type(screen.getByRole('textbox', { name: 'Lunch note' }), 'Salad{Enter}')

    expect(radioNamed('Alcohol day')).toBeChecked()
    expect(switchNamed('Lunch')).toHaveAttribute('aria-checked', 'true')
    expect(setDayMark).not.toHaveBeenCalled()
    expect(setCheatMeal).not.toHaveBeenCalled()
    expect(setDayNote).not.toHaveBeenCalled()
    expect(setMealNote).not.toHaveBeenCalled()
  })

  test('Save saves the mark, a cheat meal and both kinds of notes together, then closes', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSheet()
    await screen.findByDisplayValue('Birthday')
    await waitFor(() => expect(radioNamed('None')).toBeEnabled())

    await user.click(radioNamed('Cheat day'))
    await user.click(switchNamed('Lunch'))
    await user.type(screen.getByRole('textbox', { name: 'Day note' }), ' party')
    await user.type(screen.getByRole('textbox', { name: 'Lunch note' }), 'Leftovers at work')
    await user.click(saveButton())

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(setDayMark).toHaveBeenCalledWith('u1', '2026-10-02', 'cheat')
    expect(setCheatMeal).toHaveBeenCalledTimes(1)
    expect(setCheatMeal).toHaveBeenCalledWith({
      userId: 'u1',
      date: '2026-10-02',
      mealType: 'lunch',
      cheatMeal: true,
    })
    expect(setDayNote).toHaveBeenCalledWith('u1', '2026-10-02', 'Birthday party')
    expect(setMealNote).toHaveBeenCalledTimes(1)
    expect(setMealNote).toHaveBeenCalledWith({
      userId: 'u1',
      date: '2026-10-02',
      mealType: 'lunch',
      note: 'Leftovers at work',
    })
    expect(window.confirm).not.toHaveBeenCalled()
  })

  test('only the changed parts are sent', async () => {
    const user = userEvent.setup()
    renderSheet()
    await waitFor(() => expect(switchNamed('Dinner')).toHaveAttribute('aria-checked', 'true'))
    await screen.findByDisplayValue('Birthday')

    await user.click(switchNamed('Dinner'))
    await user.click(saveButton())

    await waitFor(() => expect(setCheatMeal).toHaveBeenCalledTimes(1))
    expect(setCheatMeal).toHaveBeenCalledWith({
      userId: 'u1',
      date: '2026-10-02',
      mealType: 'dinner',
      cheatMeal: false,
    })
    expect(setDayMark).not.toHaveBeenCalled()
    expect(setDayNote).not.toHaveBeenCalled()
    expect(setMealNote).not.toHaveBeenCalled()
  })

  test('clearing the day note and saving removes it', async () => {
    const user = userEvent.setup()
    renderSheet()
    const day = await screen.findByDisplayValue('Birthday')

    await user.clear(day)
    await user.click(saveButton())

    await waitFor(() => expect(setDayNote).toHaveBeenCalledWith('u1', '2026-10-02', ''))
    expect(setMealNote).not.toHaveBeenCalled()
  })

  test('a mark that fails to save goes back to what it was', async () => {
    const user = userEvent.setup()
    vi.mocked(setDayMark).mockRejectedValue(new Error('offline'))
    renderSheet()
    await waitFor(() => expect(radioNamed('None')).toBeEnabled())

    await user.click(radioNamed('Alcohol day'))
    await user.click(saveButton())

    await waitFor(() => expect(radioNamed('None')).toBeChecked())
    expect(radioNamed('Alcohol day')).not.toBeChecked()
  })

  test('Close with changes asks first; Cancel keeps the sheet and the edits', async () => {
    const user = userEvent.setup()
    vi.mocked(window.confirm).mockReturnValue(false)
    const { onClose } = renderSheet()
    await waitFor(() => expect(radioNamed('None')).toBeEnabled())

    await user.click(radioNamed('Cheat day'))
    await user.click(closeButton())

    expect(window.confirm).toHaveBeenCalledWith('Discard changes?')
    expect(onClose).not.toHaveBeenCalled()
    expect(radioNamed('Cheat day')).toBeChecked()
    expect(setDayMark).not.toHaveBeenCalled()
  })

  test('Close with changes closes without saving when discarding is confirmed', async () => {
    const user = userEvent.setup()
    vi.mocked(window.confirm).mockReturnValue(true)
    const { onClose } = renderSheet()
    await screen.findByDisplayValue('Birthday')

    await user.type(screen.getByRole('textbox', { name: 'Day note' }), '!')
    await user.click(closeButton())

    expect(window.confirm).toHaveBeenCalledWith('Discard changes?')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(setDayNote).not.toHaveBeenCalled()
  })

  test('Escape, the backdrop and a swipe down go through the same question', async () => {
    const user = userEvent.setup()
    vi.mocked(window.confirm).mockReturnValue(false)
    const { onClose } = renderSheet()
    await waitFor(() => expect(radioNamed('None')).toBeEnabled())
    await user.click(switchNamed('Lunch'))

    await user.keyboard('{Escape}')
    await user.click(screen.getByTestId('sheet-backdrop'))
    const handle = screen.getByTestId('sheet-drag-handle')
    fireEvent.pointerDown(handle, { clientY: 100 })
    fireEvent.pointerUp(handle, { clientY: 400 })

    expect(window.confirm).toHaveBeenCalledTimes(3)
    expect(onClose).not.toHaveBeenCalled()
  })

  test('Close without changes closes directly', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSheet()
    await waitFor(() => expect(radioNamed('None')).toBeEnabled())

    await user.click(closeButton())

    expect(window.confirm).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
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
})
