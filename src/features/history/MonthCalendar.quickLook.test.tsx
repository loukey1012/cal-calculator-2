import { act, fireEvent, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { renderWithProviders } from '../../test/render'

vi.mock('../meals/mealsApi', () => ({ fetchDayNote: vi.fn(), fetchDay: vi.fn() }))
vi.mock('../dayMarks/useDayFlags', () => ({ useDayFlags: vi.fn() }))

import { useDayFlags } from '../dayMarks/useDayFlags'
import { DayQuickLook } from './DayQuickLook'
import { MonthCalendar } from './MonthCalendar'

const LONG_PRESS_MS = 500

function calendar(month: string, { scope = 'u1', onSelectDay = vi.fn(), pageShown = true } = {}) {
  return (
    <MonthCalendar
      month={month}
      today="2026-10-15"
      selectedDay={null}
      statusOf={() => 'none'}
      marksOf={() => ({ hasNote: false, weighed: false, estimated: false, gym: false, sex: false })}
      onSelectDay={onSelectDay}
      onChangeMonth={vi.fn()}
      quickLookScope={scope}
      pageShown={pageShown}
      renderQuickLook={(date, close, pinned) => (
        <DayQuickLook
          userId="u1"
          date={date}
          kcal={0}
          estimated={false}
          goalKcal={null}
          status={null}
          hasFood={false}
          hasNote={false}
          householdId={null}
          pinned={pinned}
          onClose={close}
        />
      )}
    />
  )
}

const dayButton = () => screen.getByRole('button', { name: /^October 3$/ })
const press = { pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 }

/** Holds October 3 and lifts the finger, as on the phone. */
function holdAndRelease() {
  fireEvent.pointerDown(dayButton(), press)
  act(() => void vi.advanceTimersByTime(LONG_PRESS_MS))
  fireEvent.pointerUp(dayButton(), press)
  fireEvent.click(dayButton())
}

/**
 * Renders again with the same providers kept in place (`rerender` of the plain result would swap
 * the whole tree and mount the calendar anew, which closes a quick look for the wrong reason).
 */
function renderKept(ui: ReactElement, route = '/') {
  const view = renderWithProviders(ui, { route })
  return (next: ReactElement) =>
    view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <MemoryRouter initialEntries={[route]}>{next}</MemoryRouter>
      </QueryClientProvider>,
    )
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(useDayFlags).mockReturnValue({
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
  })
})
afterEach(() => vi.useRealTimers())

describe('the pinned quick look', () => {
  test('stays open after the release and has the focus', () => {
    renderWithProviders(calendar('2026-10-01'))

    holdAndRelease()

    expect(screen.getByRole('dialog', { name: /October 3/ })).toHaveFocus()
  })

  test('closes on a tap outside', () => {
    renderWithProviders(calendar('2026-10-01'))
    holdAndRelease()

    fireEvent.pointerDown(document.body)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('closes on Escape', () => {
    renderWithProviders(calendar('2026-10-01'))
    holdAndRelease()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('closes when the month changes', () => {
    const rerender = renderKept(calendar('2026-10-01'))
    holdAndRelease()

    rerender(calendar('2026-09-01'))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('a tap inside the Cheat list does not close it, a tap outside both does', () => {
    renderWithProviders(calendar('2026-10-01'))
    holdAndRelease()
    fireEvent.click(screen.getByRole('button', { name: 'Cheat' }))
    const list = screen.getByRole('dialog', { name: 'Cheat' })

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Whole day' }))
    expect(screen.getByRole('dialog', { name: /October 3/ })).toBeInTheDocument()
    expect(list).toBeInTheDocument()

    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('closes when the page stops being the shown one (another tab, a page on top)', () => {
    const rerender = renderKept(calendar('2026-10-01'))
    holdAndRelease()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    rerender(calendar('2026-10-01', { pageShown: false }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('closes when the shown person changes', () => {
    const rerender = renderKept(calendar('2026-10-01', { scope: 'u1' }))
    holdAndRelease()

    rerender(calendar('2026-10-01', { scope: 'u2' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('closes when the app goes to the background', () => {
    renderWithProviders(calendar('2026-10-01'))
    holdAndRelease()
    const hidden = vi.spyOn(Document.prototype, 'visibilityState', 'get').mockReturnValue('hidden')

    act(() => void document.dispatchEvent(new Event('visibilitychange')))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    hidden.mockRestore()
  })

  test('closes on pagehide', () => {
    renderWithProviders(calendar('2026-10-01'))
    holdAndRelease()

    act(() => void window.dispatchEvent(new Event('pagehide')))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('the tap that dismisses it does not open the tapped day, the next tap does', () => {
    const onSelectDay = vi.fn()
    renderWithProviders(calendar('2026-10-01', { onSelectDay }))
    holdAndRelease()
    const other = screen.getByRole('button', { name: /^October 4$/ })

    fireEvent.pointerDown(other, { ...press, pointerId: 2 })
    fireEvent.pointerUp(other, { ...press, pointerId: 2 })
    fireEvent.click(other)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onSelectDay).not.toHaveBeenCalled()

    fireEvent.click(other)
    expect(onSelectDay).toHaveBeenCalledWith('2026-10-04')
  })

  test('a dismissing press that never clicks does not eat a later tap', () => {
    const onSelectDay = vi.fn()
    renderWithProviders(calendar('2026-10-01', { onSelectDay }))
    holdAndRelease()
    const other = screen.getByRole('button', { name: /^October 4$/ })

    fireEvent.pointerDown(other, press)
    fireEvent.pointerUp(other, press)
    act(() => void vi.advanceTimersByTime(1000))
    fireEvent.click(other)

    expect(onSelectDay).toHaveBeenCalledWith('2026-10-04')
  })

  test('focus goes back to the day when it closes', () => {
    renderWithProviders(calendar('2026-10-01'))
    dayButton().focus()
    holdAndRelease()
    expect(screen.getByRole('dialog')).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(dayButton()).toHaveFocus()
  })

  test('the card does not select text or show the touch callout', () => {
    renderWithProviders(calendar('2026-10-01'))
    holdAndRelease()

    expect(screen.getByRole('dialog').className).toMatch(/select-none/)
    expect(screen.getByRole('dialog').className).toMatch(/-webkit-touch-callout:none/)
  })
})
