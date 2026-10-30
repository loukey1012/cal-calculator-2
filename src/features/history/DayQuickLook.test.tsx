import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useState } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'
import type { DayStatusInput } from './dayStatusPill'

vi.mock('../meals/mealsApi', () => ({ fetchDayNote: vi.fn(), fetchDay: vi.fn() }))
vi.mock('../dayMarks/useDayFlags', () => ({ useDayFlags: vi.fn() }))

import { fetchDay, fetchDayNote } from '../meals/mealsApi'
import { useDayFlags, type DayFlags } from '../dayMarks/useDayFlags'
import { DayQuickLook } from './DayQuickLook'

function flagsOf(overrides: Partial<DayFlags> = {}): DayFlags {
  return {
    dayMark: null,
    dayMarkLoaded: true,
    cheatMeals: new Set(),
    cheatMealsLoaded: true,
    gym: false,
    gymLoaded: true,
    sex: null,
    sexLoaded: false,
    toggle: vi.fn(),
    toggleCheatMeal: vi.fn(),
    ...overrides,
  }
}

const STATUS: DayStatusInput = {
  date: '2026-10-02',
  today: '2026-10-15',
  day: { date: '2026-10-02', mealCount: 3, lunchLogged: true, dinnerLogged: true },
  kcal: 1850,
  estimated: false,
  goal: {
    validFrom: '2026-09-01',
    kcal: 2000,
    proteinG: null,
    carbsG: null,
    fatG: null,
    fiberG: null,
    weightGoalKg: null,
  },
}

function renderLook(props: Partial<React.ComponentProps<typeof DayQuickLook>> = {}) {
  const onClose = vi.fn()
  renderWithProviders(
    <div>
      <p>outside</p>
      <DayQuickLook
        userId="u1"
        date="2026-10-02"
        kcal={1850}
        estimated={false}
        goalKcal={2000}
        status={STATUS}
        hasFood
        hasNote
        householdId={null}
        onClose={onClose}
        {...props}
      />
    </div>,
  )
  return { onClose }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useDayFlags).mockReturnValue(flagsOf())
  vi.mocked(fetchDayNote).mockResolvedValue('Birthday at Oma’s')
  vi.mocked(fetchDay).mockResolvedValue([])
})

describe('DayQuickLook', () => {
  test('is a dialog named by the date, with the verdict and the calories', () => {
    renderLook()

    const dialog = screen.getByRole('dialog', { name: /October 2/ })
    expect(dialog).toHaveTextContent(/Within goal/)
    expect(dialog).toHaveTextContent('1,850 of 2,000 kcal')
  })

  test('has the flag buttons of the day instead of a marks line', () => {
    renderLook()

    const group = within(screen.getByRole('dialog')).getByRole('group', { name: 'Day flags' })
    expect(
      within(group)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Cheat', 'Alcohol', 'Gym'])
    expect(screen.queryByTestId('quick-look-marks')).not.toBeInTheDocument()
  })

  test('asks for the flags of that person, household and day', () => {
    renderLook({ householdId: 'h1' })

    expect(useDayFlags).toHaveBeenCalledWith({
      userId: 'u1',
      householdId: 'h1',
      date: '2026-10-02',
    })
  })

  test('has a Sex button only with a household', () => {
    vi.mocked(useDayFlags).mockReturnValue(flagsOf({ sex: false, sexLoaded: true }))
    renderLook({ householdId: 'h1' })

    expect(screen.getByRole('button', { name: 'Sex' })).toBeInTheDocument()
  })

  test('names the partner on the group when it is their day', () => {
    renderLook({ partnerName: 'Baby' })

    expect(screen.getByRole('group', { name: 'Day flags for Baby' })).toBeInTheDocument()
  })

  test('taps on the buttons toggle the flags', async () => {
    const flags = flagsOf({ sex: false, sexLoaded: true })
    vi.mocked(useDayFlags).mockReturnValue(flags)
    renderLook({ householdId: 'h1' })

    await userEvent.click(screen.getByRole('button', { name: 'Alcohol' }))
    await userEvent.click(screen.getByRole('button', { name: 'Gym' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sex' }))

    expect(vi.mocked(flags.toggle).mock.calls).toEqual([['alcohol'], ['gym'], ['sex']])
  })

  test('a tap on a button does not close it', async () => {
    const { onClose } = renderLook()

    await userEvent.click(screen.getByRole('button', { name: 'Gym' }))

    expect(onClose).not.toHaveBeenCalled()
  })

  test('the Cheat list toggles the whole day and the meals, and a tap in it does not close it', async () => {
    const flags = flagsOf()
    vi.mocked(useDayFlags).mockReturnValue(flags)
    const { onClose } = renderLook()

    await userEvent.click(screen.getByRole('button', { name: 'Cheat' }))
    await userEvent.click(screen.getByRole('button', { name: 'Whole day' }))
    await userEvent.click(screen.getByRole('button', { name: 'Lunch' }))

    expect(flags.toggle).toHaveBeenCalledWith('cheatDay')
    expect(flags.toggleCheatMeal).toHaveBeenCalledWith('lunch')
    expect(onClose).not.toHaveBeenCalled()
  })

  test('Escape with the Cheat list open closes only the list', async () => {
    const { onClose } = renderLook()
    await userEvent.click(screen.getByRole('button', { name: 'Cheat' }))

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Cheat' })).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  test('a tap outside with the Cheat list open closes both', async () => {
    const { onClose } = renderLook()
    await userEvent.click(screen.getByRole('button', { name: 'Cheat' }))

    await userEvent.click(screen.getByText('outside'))

    expect(onClose).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog', { name: 'Cheat' })).not.toBeInTheDocument()
  })

  test('shows just the calories without a goal', () => {
    renderLook({ goalKcal: null })

    expect(screen.getByRole('dialog')).toHaveTextContent('1,850 kcal')
    expect(screen.getByRole('dialog')).not.toHaveTextContent('of')
  })

  test('marks estimated calories with a tilde', () => {
    renderLook({ estimated: true })

    expect(screen.getByRole('dialog')).toHaveTextContent('~1,850 of 2,000 kcal')
  })

  test('says so when nothing was logged', () => {
    renderLook({ kcal: 0, status: null, goalKcal: null, hasFood: false, hasNote: false })

    expect(screen.getByRole('dialog')).toHaveTextContent('Nothing logged')
  })

  test('says so too once the goal is known, not "0 of 2,000 kcal"', () => {
    renderLook({ kcal: 0, hasFood: false, hasNote: false })

    expect(screen.getByRole('dialog')).toHaveTextContent('Nothing logged')
    expect(screen.getByRole('dialog')).not.toHaveTextContent('of 2,000')
  })

  test('shows the calories while the goal is still loading', () => {
    renderLook({ status: null, goalKcal: null })

    expect(screen.getByRole('dialog')).toHaveTextContent('1,850 kcal')
  })

  test('shows the notes of the day’s meals, by meal', async () => {
    vi.mocked(fetchDayNote).mockResolvedValue(null)
    vi.mocked(fetchDay).mockResolvedValue([
      { id: 'm2', meal_type: 'dinner', meal_items: [], note: 'Pizza with colleagues' },
      { id: 'm1', meal_type: 'lunch', meal_items: [], note: null },
    ])
    renderLook()

    expect(await screen.findByText('Dinner: Pizza with colleagues')).toBeInTheDocument()
    expect(screen.queryByText(/Lunch:/)).not.toBeInTheDocument()
  })

  test('is drawn on the page, outside the transformed ancestors of the calendar', () => {
    renderLook()

    const dialog = screen.getByRole('dialog')
    expect(dialog.parentElement).toBe(document.body)
  })

  test('does not take the focus while the finger is still down', () => {
    renderLook()

    expect(document.activeElement).toBe(document.body)
  })

  test('takes the focus once pinned', () => {
    renderLook({ pinned: true })

    expect(screen.getByRole('dialog', { name: /October 2/ })).toHaveFocus()
  })

  test('takes the focus when it becomes pinned', () => {
    function Harness() {
      const [pinned, setPinned] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setPinned(true)}>
            pin
          </button>
          <DayQuickLook
            userId="u1"
            date="2026-10-02"
            kcal={0}
            estimated={false}
            goalKcal={null}
            status={null}
            hasFood={false}
            hasNote={false}
            householdId={null}
            pinned={pinned}
            onClose={vi.fn()}
          />
        </>
      )
    }
    renderWithProviders(<Harness />)
    expect(document.activeElement).toBe(document.body)

    act(() => screen.getByRole('button', { name: 'pin' }).click())

    expect(screen.getByRole('dialog', { name: /October 2/ })).toHaveFocus()
  })

  test('keeps its listeners when the caller passes a new close function', async () => {
    const first = vi.fn()
    const second = vi.fn()
    let swapClose: (close: () => void) => void = () => undefined
    function Swappable() {
      const [close, setClose] = useState<() => void>(() => first)
      useEffect(() => {
        swapClose = (next) => setClose(() => next)
      }, [])
      return (
        <DayQuickLook
          userId="u1"
          date="2026-10-02"
          kcal={1850}
          estimated={false}
          goalKcal={2000}
          status={STATUS}
          hasFood
          hasNote={false}
          householdId={null}
          onClose={close}
        />
      )
    }
    renderWithProviders(<Swappable />)
    const add = vi.spyOn(document, 'addEventListener')

    act(() => swapClose(second))
    expect(add).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
    add.mockRestore()
  })

  test('shows the day note when the day has one', async () => {
    renderLook()

    expect(await screen.findByText('Birthday at Oma’s')).toBeInTheDocument()
  })

  test('does not ask for a note on a day without one', () => {
    renderLook({ hasNote: false })

    expect(fetchDayNote).not.toHaveBeenCalled()
  })

  test('closes with Escape', async () => {
    const { onClose } = renderLook()

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledOnce()
  })

  test('closes when tapping outside, not when tapping inside', async () => {
    const { onClose } = renderLook()

    await userEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
    await userEvent.click(screen.getByText('outside'))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
