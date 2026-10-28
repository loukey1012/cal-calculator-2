import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useState } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'
import type { DayStatusInput } from './dayStatusPill'

vi.mock('../meals/mealsApi', () => ({ fetchDayNote: vi.fn(), fetchDay: vi.fn() }))

import { fetchDay, fetchDayNote } from '../meals/mealsApi'
import { DayQuickLook } from './DayQuickLook'

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
    kcalBurned: null,
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
        onClose={onClose}
        {...props}
      />
    </div>,
  )
  return { onClose }
}

beforeEach(() => {
  vi.clearAllMocks()
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

  test('does not take the focus from the finger', () => {
    renderLook()

    expect(screen.getByRole('dialog')).not.toContainElement(document.activeElement as HTMLElement)
    expect(document.activeElement).toBe(document.body)
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
