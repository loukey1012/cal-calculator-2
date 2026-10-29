import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'

vi.mock('../dayMarks/dayMarksApi', () => ({
  fetchGymDay: vi.fn(),
  fetchSexDay: vi.fn(),
  setGymDay: vi.fn(),
  setSexDay: vi.fn(),
}))
vi.mock('../meals/mealsApi', () => ({
  fetchDay: vi.fn(),
  fetchDayMark: vi.fn(),
  setCheatMeal: vi.fn(),
  setDayMark: vi.fn(),
}))

import { fetchGymDay, fetchSexDay, setGymDay, setSexDay } from '../dayMarks/dayMarksApi'
import { fetchDay, fetchDayMark, setCheatMeal, setDayMark } from '../meals/mealsApi'
import type { MealType } from '../meals/dayModel'
import type { DayMark } from '../meals/mealsApi'
import { dayMeal, mealItem } from '../meals/testData'
import { DayOptionsSheet } from './DayOptionsSheet'

// a small server: what was saved is what the next fetch returns
let markOnServer: DayMark = null
let cheatMealsOnServer = new Set<MealType>(['dinner'])
let gymOnServer = false
let sexOnServer = false

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  markOnServer = null
  gymOnServer = false
  sexOnServer = false
  cheatMealsOnServer = new Set(['dinner'])
  vi.mocked(fetchGymDay).mockImplementation(async () => gymOnServer)
  vi.mocked(fetchSexDay).mockImplementation(async () => sexOnServer)
  vi.mocked(setGymDay).mockImplementation(async (_userId, _date, on) => {
    gymOnServer = on
  })
  vi.mocked(setSexDay).mockImplementation(async (_householdId, _date, on) => {
    sexOnServer = on
  })
  vi.mocked(fetchDay).mockImplementation(async () => [
    {
      ...dayMeal('m1', 'dinner', []),
      cheat_meal: cheatMealsOnServer.has('dinner'),
    },
    {
      ...dayMeal('m2', 'lunch', [mealItem({ id: 'pasta' })]),
      cheat_meal: cheatMealsOnServer.has('lunch'),
    },
  ])
  vi.mocked(fetchDayMark).mockImplementation(async () => markOnServer)
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

function renderSheet(householdId: string | null = 'h1') {
  const onClose = vi.fn()
  const { queryClient } = renderWithProviders(
    <DayOptionsSheet
      open
      userId="u1"
      householdId={householdId}
      date="2026-10-02"
      onClose={onClose}
    />,
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

    expect(radioNamed('Alcohol day')).toBeChecked()
    expect(switchNamed('Lunch')).toHaveAttribute('aria-checked', 'true')
    expect(setDayMark).not.toHaveBeenCalled()
    expect(setCheatMeal).not.toHaveBeenCalled()
  })

  test('Save saves the mark and a cheat meal together, then closes', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSheet()
    await waitFor(() => expect(radioNamed('None')).toBeEnabled())

    await user.click(radioNamed('Cheat day'))
    await user.click(switchNamed('Lunch'))
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
    expect(window.confirm).not.toHaveBeenCalled()
  })

  test('only the changed parts are sent', async () => {
    const user = userEvent.setup()
    renderSheet()
    await waitFor(() => expect(switchNamed('Dinner')).toHaveAttribute('aria-checked', 'true'))

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

    await user.click(switchNamed('Lunch'))
    await user.click(closeButton())

    expect(window.confirm).toHaveBeenCalledWith('Discard changes?')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(setDayMark).not.toHaveBeenCalled()
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

  describe('Marks', () => {
    test('shows Gym and Sex as they are saved, with what they do and do not do', async () => {
      gymOnServer = true
      renderSheet()

      await waitFor(() => expect(switchNamed('Gym')).toHaveAttribute('aria-checked', 'true'))
      expect(switchNamed('Sex')).toHaveAttribute('aria-checked', 'false')
      expect(
        screen.getByText(
          'Gym is per person. Sex shows on both calendars. Neither changes any figure.',
        ),
      ).toBeInTheDocument()
    })

    test('has no Sex row without a household', async () => {
      renderSheet(null)

      await waitFor(() => expect(switchNamed('Gym')).toBeEnabled())
      expect(screen.queryByRole('switch', { name: 'Sex' })).not.toBeInTheDocument()
      expect(fetchSexDay).not.toHaveBeenCalled()
    })

    test('Gym and Sex can only be switched once their data has loaded', async () => {
      vi.mocked(fetchGymDay).mockImplementation(() => new Promise(() => {}))
      vi.mocked(fetchSexDay).mockImplementation(() => new Promise(() => {}))
      renderSheet()

      await waitFor(() => expect(radioNamed('None')).toBeEnabled())
      expect(switchNamed('Gym')).toBeDisabled()
      expect(switchNamed('Sex')).toBeDisabled()
    })

    test('a failed marks query shows its error and the other fields can still be saved', async () => {
      const user = userEvent.setup()
      vi.mocked(fetchGymDay).mockRejectedValue(new Error('Gym days could not be loaded'))
      renderSheet()

      expect(await screen.findByText('Gym days could not be loaded')).toBeInTheDocument()
      expect(switchNamed('Gym')).toBeDisabled()
      await waitFor(() => expect(radioNamed('None')).toBeEnabled())
      await user.click(radioNamed('Cheat day'))
      await user.click(saveButton())

      await waitFor(() => expect(setDayMark).toHaveBeenCalledWith('u1', '2026-10-02', 'cheat'))
      expect(setGymDay).not.toHaveBeenCalled()
    })

    test('the switches are kept only on Save', async () => {
      const user = userEvent.setup()
      renderSheet()
      await waitFor(() => expect(saveButton()).toBeDisabled())
      await waitFor(() => expect(switchNamed('Gym')).toBeEnabled())

      await user.click(switchNamed('Gym'))
      await user.click(switchNamed('Sex'))

      expect(switchNamed('Gym')).toHaveAttribute('aria-checked', 'true')
      expect(setGymDay).not.toHaveBeenCalled()
      expect(setSexDay).not.toHaveBeenCalled()
      await user.click(saveButton())
      await waitFor(() => expect(setGymDay).toHaveBeenCalledWith('u1', '2026-10-02', true))
      expect(setSexDay).toHaveBeenCalledWith('h1', '2026-10-02', true)
    })

    test('a switch put back counts as no change; closing with a change asks first', async () => {
      const user = userEvent.setup()
      const { onClose } = renderSheet()
      await waitFor(() => expect(radioNamed('None')).toBeEnabled())

      await user.click(switchNamed('Sex'))
      await user.click(switchNamed('Sex'))
      expect(saveButton()).toBeDisabled()

      await user.click(switchNamed('Gym'))
      vi.mocked(window.confirm).mockReturnValueOnce(false)
      await user.click(closeButton())
      expect(window.confirm).toHaveBeenCalledWith('Discard changes?')
      expect(onClose).not.toHaveBeenCalled()
      expect(setGymDay).not.toHaveBeenCalled()
    })

    test('only the changed mark is sent, and a mark can be taken back', async () => {
      const user = userEvent.setup()
      sexOnServer = true
      renderSheet()
      await waitFor(() => expect(switchNamed('Sex')).toHaveAttribute('aria-checked', 'true'))

      await user.click(switchNamed('Sex'))
      await user.click(saveButton())

      await waitFor(() => expect(setSexDay).toHaveBeenCalledWith('h1', '2026-10-02', false))
      expect(setGymDay).not.toHaveBeenCalled()
    })
  })
})
