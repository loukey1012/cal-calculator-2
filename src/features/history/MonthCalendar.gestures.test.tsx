import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi, type Mock } from 'vitest'
import { MonthCalendar } from './MonthCalendar'

const LONG_PRESS_MS = 500

function calendar(
  month: string,
  today: string,
  handlers: { onSelectDay: Mock; onChangeMonth: Mock; onClose: Mock },
) {
  const { onSelectDay, onChangeMonth, onClose } = handlers
  return (
    <MonthCalendar
      month={month}
      today={today}
      selectedDay={null}
      statusOf={() => 'none'}
      marksOf={() => ({
        hasNote: false,
        weighed: false,
        estimated: false,
        gym: false,
        sex: false,
      })}
      onSelectDay={onSelectDay}
      onChangeMonth={onChangeMonth}
      renderQuickLook={(date, close, pinned) => (
        <div role="dialog" aria-label={`look ${date}`} data-pinned={pinned}>
          <button type="button" onClick={() => (onClose(), close())}>
            close
          </button>
        </div>
      )}
    />
  )
}

function renderCalendar({ month = '2026-10-01', today = '2026-10-15' } = {}) {
  const handlers = { onSelectDay: vi.fn(), onChangeMonth: vi.fn(), onClose: vi.fn() }
  const view = render(calendar(month, today, handlers))
  const showMonth = (shown: string) => view.rerender(calendar(shown, today, handlers))
  return { ...handlers, showMonth, unmount: view.unmount }
}

function grid() {
  return screen.getByRole('table')
}

function swipe(from: { x: number; y: number }, to: { x: number; y: number }, target = grid()) {
  fireEvent.pointerDown(target, { pointerId: 1, isPrimary: true, clientX: from.x, clientY: from.y })
  fireEvent.pointerMove(target, { pointerId: 1, isPrimary: true, clientX: to.x, clientY: to.y })
  fireEvent.pointerUp(target, { pointerId: 1, isPrimary: true, clientX: to.x, clientY: to.y })
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('swiping between months', () => {
  test('the grid keeps sideways drags to itself, so tabs and back swipe leave them alone', () => {
    renderCalendar()

    expect(grid().closest('[data-swipe-lock]')).not.toBeNull()
  })

  test('swiping right goes to the previous month', () => {
    const { onChangeMonth } = renderCalendar()

    swipe({ x: 100, y: 300 }, { x: 220, y: 310 })

    expect(onChangeMonth).toHaveBeenCalledExactlyOnceWith('2026-09-01')
  })

  test('swiping left goes to the next month when there is one', () => {
    const { onChangeMonth } = renderCalendar({ month: '2026-09-01' })

    swipe({ x: 220, y: 300 }, { x: 100, y: 290 })

    expect(onChangeMonth).toHaveBeenCalledExactlyOnceWith('2026-10-01')
  })

  test('swiping left on the current month stays put, like the disabled next button', () => {
    const { onChangeMonth } = renderCalendar()

    swipe({ x: 220, y: 300 }, { x: 100, y: 300 })

    expect(onChangeMonth).not.toHaveBeenCalled()
  })

  test('a mostly vertical move does not change the month', () => {
    const { onChangeMonth } = renderCalendar()

    swipe({ x: 100, y: 200 }, { x: 160, y: 400 })

    expect(onChangeMonth).not.toHaveBeenCalled()
  })

  test('a short sideways move does not change the month', () => {
    const { onChangeMonth } = renderCalendar()

    swipe({ x: 100, y: 300 }, { x: 120, y: 300 })

    expect(onChangeMonth).not.toHaveBeenCalled()
  })

  test('a cancelled gesture (the browser took it to scroll) does not change the month', () => {
    const { onChangeMonth } = renderCalendar()

    fireEvent.pointerDown(grid(), { pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
    fireEvent.pointerCancel(grid(), { pointerId: 1, isPrimary: true })
    fireEvent.pointerUp(grid(), { pointerId: 1, isPrimary: true, clientX: 300, clientY: 300 })

    expect(onChangeMonth).not.toHaveBeenCalled()
  })

  test('a swipe that ends on a day does not select it', () => {
    const { onSelectDay } = renderCalendar()
    const day = screen.getByRole('button', { name: /^October 3$/ })

    swipe({ x: 100, y: 300 }, { x: 220, y: 300 }, day)
    fireEvent.click(day)

    expect(onSelectDay).not.toHaveBeenCalled()
  })

  test('a plain click long after a swipe (keyboard, VoiceOver) still selects the day', () => {
    const { onSelectDay } = renderCalendar()
    const day = screen.getByRole('button', { name: /^October 3$/ })

    swipe({ x: 100, y: 300 }, { x: 220, y: 300 })
    act(() => void vi.advanceTimersByTime(1000))
    fireEvent.click(day)

    expect(onSelectDay).toHaveBeenCalledExactlyOnceWith('2026-10-03')
  })

  test('a second finger is not a swipe of its own', () => {
    const { onChangeMonth } = renderCalendar({ month: '2026-09-01' })

    fireEvent.pointerDown(grid(), { pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
    fireEvent.pointerDown(grid(), { pointerId: 2, isPrimary: false, clientX: 300, clientY: 300 })
    fireEvent.pointerUp(grid(), { pointerId: 2, isPrimary: false, clientX: 100, clientY: 300 })
    fireEvent.pointerUp(grid(), { pointerId: 1, isPrimary: true, clientX: 101, clientY: 300 })

    expect(onChangeMonth).not.toHaveBeenCalled()
  })

  test('a swipe that is released outside the grid still turns the month', () => {
    const { onChangeMonth } = renderCalendar()

    fireEvent.pointerDown(grid(), { pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
    fireEvent.pointerUp(document.body, {
      pointerId: 1,
      isPrimary: true,
      clientX: 220,
      clientY: 300,
    })

    expect(onChangeMonth).toHaveBeenCalledExactlyOnceWith('2026-09-01')
  })

  test('taps on days still select them', () => {
    const { onSelectDay, onChangeMonth } = renderCalendar()
    const day = screen.getByRole('button', { name: /^October 3$/ })

    fireEvent.pointerDown(day, { pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
    fireEvent.pointerUp(day, { pointerId: 1, isPrimary: true, clientX: 101, clientY: 300 })
    fireEvent.click(day)

    expect(onSelectDay).toHaveBeenCalledExactlyOnceWith('2026-10-03')
    expect(onChangeMonth).not.toHaveBeenCalled()
  })
})

describe('the Today button', () => {
  test('is hidden on the current month', () => {
    renderCalendar()

    expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument()
  })

  test('jumps back to the current month from another one, without selecting a day', () => {
    const { onChangeMonth, onSelectDay } = renderCalendar({ month: '2026-07-01' })

    fireEvent.click(screen.getByRole('button', { name: 'Today' }))

    expect(onChangeMonth).toHaveBeenCalledExactlyOnceWith('2026-10-01')
    expect(onSelectDay).not.toHaveBeenCalled()
  })
})

describe('holding a day', () => {
  const dayButton = () => screen.getByRole('button', { name: /^October 3$/ })

  function hold(ms = LONG_PRESS_MS) {
    fireEvent.pointerDown(dayButton(), {
      pointerId: 1,
      isPrimary: true,
      clientX: 100,
      clientY: 300,
    })
    act(() => void vi.advanceTimersByTime(ms))
  }

  test('shows the quick look after half a second', () => {
    renderCalendar()

    hold(LONG_PRESS_MS - 1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    act(() => void vi.advanceTimersByTime(1))

    expect(screen.getByRole('dialog', { name: 'look 2026-10-03' })).toBeInTheDocument()
  })

  test('letting go keeps it open, pinned, and does not select the day', () => {
    const { onSelectDay } = renderCalendar()
    hold()
    expect(screen.getByRole('dialog')).toHaveAttribute('data-pinned', 'false')

    fireEvent.pointerUp(dayButton(), { pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
    fireEvent.click(dayButton())

    expect(screen.getByRole('dialog', { name: 'look 2026-10-03' })).toHaveAttribute(
      'data-pinned',
      'true',
    )
    expect(onSelectDay).not.toHaveBeenCalled()
  })

  test('a cancelled pointer after the hold pins it too', () => {
    renderCalendar()
    hold()

    fireEvent.pointerCancel(dayButton(), { pointerId: 1, isPrimary: true })

    expect(screen.getByRole('dialog')).toHaveAttribute('data-pinned', 'true')
  })

  test('holding another day while one is pinned opens that one, not yet pinned', () => {
    renderCalendar()
    hold()
    fireEvent.pointerUp(dayButton(), { pointerId: 1, isPrimary: true })

    fireEvent.pointerDown(screen.getByRole('button', { name: /^October 4$/ }), {
      pointerId: 2,
      isPrimary: true,
      clientX: 140,
      clientY: 300,
    })
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS))

    expect(screen.getByRole('dialog', { name: 'look 2026-10-04' })).toHaveAttribute(
      'data-pinned',
      'false',
    )
  })

  test('a tap after a hold selects normally again', () => {
    const { onSelectDay } = renderCalendar()
    hold()
    fireEvent.pointerUp(dayButton(), { pointerId: 1, isPrimary: true })
    fireEvent.click(dayButton())

    fireEvent.pointerDown(dayButton(), {
      pointerId: 2,
      isPrimary: true,
      clientX: 100,
      clientY: 300,
    })
    fireEvent.pointerUp(dayButton(), { pointerId: 2, isPrimary: true, clientX: 100, clientY: 300 })
    fireEvent.click(dayButton())

    expect(onSelectDay).toHaveBeenCalledExactlyOnceWith('2026-10-03')
  })

  test('a quick tap shows no quick look', () => {
    renderCalendar()

    fireEvent.pointerDown(dayButton(), {
      pointerId: 1,
      isPrimary: true,
      clientX: 100,
      clientY: 300,
    })
    fireEvent.pointerUp(dayButton(), { pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS * 2))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('moving the finger away (a swipe or scroll) cancels the hold', () => {
    renderCalendar()

    fireEvent.pointerDown(dayButton(), {
      pointerId: 1,
      isPrimary: true,
      clientX: 100,
      clientY: 300,
    })
    fireEvent.pointerMove(dayButton(), {
      pointerId: 1,
      isPrimary: true,
      clientX: 140,
      clientY: 300,
    })
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS * 2))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('a cancelled pointer cancels the hold', () => {
    renderCalendar()

    fireEvent.pointerDown(dayButton(), {
      pointerId: 1,
      isPrimary: true,
      clientX: 100,
      clientY: 300,
    })
    fireEvent.pointerCancel(dayButton(), { pointerId: 1, isPrimary: true })
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS * 2))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('the long-press menu of the browser is suppressed', () => {
    renderCalendar()

    const notPrevented = fireEvent.contextMenu(dayButton())

    expect(notPrevented).toBe(false)
  })

  test('letting go outside the grid pins it', () => {
    renderCalendar()
    hold()

    fireEvent.pointerUp(document.body, {
      pointerId: 1,
      isPrimary: true,
      clientX: 100,
      clientY: 600,
    })

    expect(screen.getByRole('dialog')).toHaveAttribute('data-pinned', 'true')
  })

  test('drifting sideways while it is open and then letting go keeps the month', () => {
    const { onChangeMonth } = renderCalendar()
    hold()

    fireEvent.pointerMove(dayButton(), {
      pointerId: 1,
      isPrimary: true,
      clientX: 220,
      clientY: 300,
    })
    fireEvent.pointerUp(dayButton(), { pointerId: 1, isPrimary: true, clientX: 220, clientY: 300 })

    expect(onChangeMonth).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toHaveAttribute('data-pinned', 'true')
  })

  test('a hold ends with a plain click much later still selecting', () => {
    const { onSelectDay } = renderCalendar()
    hold()
    fireEvent.pointerUp(dayButton(), { pointerId: 1, isPrimary: true })
    act(() => void vi.advanceTimersByTime(1000))

    fireEvent.click(dayButton())

    expect(onSelectDay).toHaveBeenCalledExactlyOnceWith('2026-10-03')
  })

  test('a tap right after a hold whose click never came is not eaten', () => {
    const { onSelectDay } = renderCalendar()
    hold()
    fireEvent.pointerUp(dayButton(), { pointerId: 1, isPrimary: true })
    // the browser sent no click after the hold; the next press is a fresh tap
    act(() => void vi.advanceTimersByTime(100))
    fireEvent.pointerDown(dayButton(), {
      pointerId: 2,
      isPrimary: true,
      clientX: 100,
      clientY: 300,
    })
    fireEvent.pointerUp(dayButton(), { pointerId: 2, isPrimary: true, clientX: 100, clientY: 300 })
    fireEvent.click(dayButton())

    expect(onSelectDay).toHaveBeenCalledExactlyOnceWith('2026-10-03')
  })

  test('a second finger or the right mouse button starts no hold', () => {
    renderCalendar()

    fireEvent.pointerDown(dayButton(), {
      pointerId: 2,
      isPrimary: false,
      clientX: 100,
      clientY: 300,
    })
    fireEvent.pointerDown(dayButton(), {
      pointerId: 3,
      isPrimary: true,
      pointerType: 'mouse',
      button: 2,
      clientX: 100,
      clientY: 300,
    })
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS * 2))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('the waiting hold is dropped when the calendar goes away', () => {
    const { unmount } = renderCalendar()
    fireEvent.pointerDown(dayButton(), {
      pointerId: 1,
      isPrimary: true,
      clientX: 100,
      clientY: 300,
    })

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })

  test('a pinned quick look is closed when the month changes', () => {
    const { showMonth } = renderCalendar()
    hold()
    fireEvent.pointerUp(dayButton(), { pointerId: 1, isPrimary: true })

    showMonth('2026-09-01')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('the waiting hold is dropped, and an open quick look closed, when the month changes', () => {
    const { showMonth } = renderCalendar()
    hold()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    showMonth('2026-09-01')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.pointerDown(screen.getByRole('button', { name: /^September 3$/ }), {
      pointerId: 2,
      isPrimary: true,
      clientX: 100,
      clientY: 300,
    })
    showMonth('2026-08-01')
    expect(vi.getTimerCount()).toBe(0)
  })

  test('future days leave the touches to the grid, so swipes starting on them work', () => {
    renderCalendar()

    const future = screen.getByRole('button', { name: /^October 20$/ })

    expect(future).toBeDisabled()
    expect(future).toHaveClass('pointer-events-none')
  })

  test('the quick look closes through its own close callback', () => {
    renderCalendar()
    hold()

    fireEvent.click(screen.getByRole('button', { name: 'close' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
