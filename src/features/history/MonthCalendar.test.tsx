import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import type { DayMarks, DayStatus } from './calendar'
import { MonthCalendar } from './MonthCalendar'

const STATUS_OF: Record<string, DayStatus> = {
  '2026-10-01': 'onTarget',
  '2026-10-02': 'over',
  '2026-10-03': 'cheatDay',
  '2026-10-04': 'cheatMeal',
  '2026-10-05': 'missing',
  '2026-10-06': 'alcoholDay',
}

const NO_MARKS: DayMarks = { hasNote: false, weighed: false, estimated: false }
const MARKS_OF: Record<string, DayMarks> = {
  '2026-10-06': { ...NO_MARKS, hasNote: true, weighed: true },
  '2026-10-07': { ...NO_MARKS, estimated: true },
}

function renderCalendar(today = '2026-10-15', month = '2026-10-01') {
  const onSelectDay = vi.fn()
  const onChangeMonth = vi.fn()
  const onShowYear = vi.fn()
  render(
    <MonthCalendar
      month={month}
      today={today}
      selectedDay="2026-10-02"
      statusOf={(date) => STATUS_OF[date] ?? 'none'}
      marksOf={(date) => MARKS_OF[date] ?? NO_MARKS}
      footer={<p>footer</p>}
      onSelectDay={onSelectDay}
      onChangeMonth={onChangeMonth}
      onShowYear={onShowYear}
    />,
  )
  return { onSelectDay, onChangeMonth, onShowYear }
}

describe('MonthCalendar', () => {
  test('highlights the selected day', () => {
    renderCalendar()

    expect(screen.getByRole('button', { name: /October 2,/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: /October 1,/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  test('shows the month with Monday-first weekday headers', () => {
    renderCalendar()

    expect(screen.getByRole('heading', { name: /October 2026/ })).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')[0]).toHaveTextContent(/Mon/)
  })

  test('marks days by how they went, with an accessible description', () => {
    renderCalendar()

    expect(screen.getByRole('button', { name: /October 1.*within goal/ })).toHaveAttribute(
      'data-status',
      'onTarget',
    )
    expect(screen.getByRole('button', { name: /October 2.*over goal/ })).toHaveAttribute(
      'data-status',
      'over',
    )
    expect(screen.getByRole('button', { name: /October 3.*cheat day/ })).toHaveAttribute(
      'data-status',
      'cheatDay',
    )
    expect(screen.getByRole('button', { name: /October 4.*cheat meal/ })).toHaveAttribute(
      'data-status',
      'cheatMeal',
    )
    expect(screen.getByRole('button', { name: /October 6.*alcohol day/ })).toHaveAttribute(
      'data-status',
      'alcoholDay',
    )
    const missing = screen.getByRole('button', { name: /October 5.*lunch or dinner missing/ })
    expect(missing).toHaveAttribute('data-status', 'missing')
    expect(within(missing).getByTestId('missing-dot')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Today, October 15' })).toHaveAttribute(
      'aria-current',
      'date',
    )
  })

  test('opens past days and today, but not future days', async () => {
    const user = userEvent.setup()
    const { onSelectDay } = renderCalendar()

    await user.click(screen.getByRole('button', { name: /October 1\b/ }))
    expect(onSelectDay).toHaveBeenCalledWith('2026-10-01')
    expect(screen.getByRole('button', { name: /October 16/ })).toBeDisabled()
  })

  test('keeps the month title on one line and the month buttons 44 px wide to touch', () => {
    renderCalendar()

    expect(screen.getByRole('heading', { level: 2 })).toHaveClass('whitespace-nowrap')
    for (const name of ['Previous month', 'Next month']) {
      expect(screen.getByRole('button', { name })).toHaveClass('h-11', 'w-11')
    }
  })

  test('the month title opens the year overview and stays a heading', async () => {
    const user = userEvent.setup()
    const { onShowYear } = renderCalendar()

    const heading = screen.getByRole('heading', { level: 2, name: 'October 2026' })
    const button = within(heading).getByRole('button', { name: 'October 2026' })
    expect(button).toHaveAccessibleDescription('Show year')
    expect(button).toHaveClass('h-11')
    await user.click(button)

    expect(onShowYear).toHaveBeenCalledTimes(1)
  })

  test('moves between months', async () => {
    const user = userEvent.setup()
    const { onChangeMonth } = renderCalendar()

    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(onChangeMonth).toHaveBeenCalledWith('2026-09-01')
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
  })

  test('lists every mark of a day in its name', () => {
    renderCalendar()

    expect(
      screen.getByRole('button', { name: 'October 6, alcohol day, has a note, weigh-in' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'October 7, estimated calories' }),
    ).toBeInTheDocument()
  })

  test('draws the note dot, scale and estimate mark only where they apply', () => {
    renderCalendar()

    const marked = screen.getByRole('button', { name: /October 6,/ })
    expect(within(marked).getByTestId('note-dot')).toBeInTheDocument()
    expect(within(marked).getByTestId('weigh-in-mark')).toBeInTheDocument()
    expect(within(marked).queryByTestId('estimate-mark')).not.toBeInTheDocument()
    expect(within(marked).getByTestId('alcohol-mark')).toBeInTheDocument()
    const estimated = screen.getByRole('button', { name: /October 7,/ })
    expect(within(estimated).getByTestId('estimate-mark')).toBeInTheDocument()
    expect(within(estimated).queryByTestId('note-dot')).not.toBeInTheDocument()
    const plain = screen.getByRole('button', { name: /October 1,/ })
    expect(within(plain).queryByTestId('note-dot')).not.toBeInTheDocument()
  })

  test('marks a cheat meal with a fork and knife and a missing meal with a badge, not with dots', () => {
    renderCalendar()

    const cheatMeal = screen.getByRole('button', { name: /October 4,/ })
    expect(within(cheatMeal).getByTestId('cheat-meal-mark')).toBeInTheDocument()
    expect(within(cheatMeal).queryByTestId('note-dot')).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('button', { name: /October 5,/ })).getByTestId('missing-dot'),
    ).toBeInTheDocument()
  })

  test('outlines alcohol days in purple and cheat days in grey, both dashed', () => {
    renderCalendar()

    expect(screen.getByRole('button', { name: /October 6,/ }).className).toMatch(
      /border-dashed.*border-alcohol|border-alcohol.*border-dashed/,
    )
    expect(screen.getByRole('button', { name: /October 3,/ }).className).not.toMatch(/alcohol/)
    expect(screen.getByRole('button', { name: /October 3,/ }).className).toMatch(/border-dashed/)
  })

  test('tells today (a ring) from the selected day (filled)', () => {
    renderCalendar('2026-10-02')

    const todayAndSelected = screen.getByRole('button', { name: /Today, October 2/ })
    expect(todayAndSelected.className).toMatch(/bg-accent\b/)
    renderCalendar()
    const todayOnly = screen.getByRole('button', { name: 'Today, October 15' })
    expect(todayOnly.className).toMatch(/ring-2/)
    expect(todayOnly.className).not.toMatch(/bg-accent\b/)
  })

  test('has no week average column, only the seven weekdays', () => {
    renderCalendar()

    expect(screen.getAllByRole('columnheader')).toHaveLength(7)
    expect(screen.queryByRole('columnheader', { name: 'Ø kcal' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('week-average')).not.toBeInTheDocument()
  })

  test('shows its footer inside the card, under the grid', () => {
    renderCalendar()

    const footer = screen.getByText('footer')
    expect(footer.closest('section')).toContainElement(screen.getByRole('table'))
    expect(
      screen.getByRole('table').compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  test('draws the days as taller rounded squares', () => {
    renderCalendar()

    const cell = screen.getByRole('button', { name: /October 1,/ })
    expect(cell).toHaveClass('h-[54px]', 'w-11', 'rounded-[14px]')
  })

  test('draws only the days of the month, though the first week reaches into September', () => {
    renderCalendar()

    const firstRow = screen.getAllByTestId('week-row')[0]
    expect(firstRow.querySelectorAll('button[data-date]')).toHaveLength(4)
    expect(screen.queryByRole('button', { name: /September 30/ })).not.toBeInTheDocument()
  })

  test('tints the current week also as the first row of the month after it', () => {
    // 30 September is in the week that October's calendar shows first
    renderCalendar('2026-09-30', '2026-10-01')

    const tinted = screen.getAllByTestId('week-row').filter((row) => row.dataset.current === 'true')
    expect(tinted).toEqual([screen.getAllByTestId('week-row')[0]])
  })

  test('tints the current week also as the last row of the month before it', () => {
    renderCalendar('2026-10-02', '2026-09-01')

    const rows = screen.getAllByTestId('week-row')
    expect(rows.at(-1)).toHaveAttribute('data-current', 'true')
  })

  test('draws the marks in themed colors that keep their contrast on every style', () => {
    renderCalendar()

    const forkKnife = within(screen.getByRole('button', { name: /October 4,/ })).getByTestId(
      'cheat-meal-mark',
    )
    expect(forkKnife).toHaveClass('text-label-secondary')
    expect(forkKnife).toHaveAttribute('fill', 'none')
    const badge = within(screen.getByRole('button', { name: /October 5,/ })).getByTestId(
      'missing-dot',
    )
    expect(badge).toHaveClass('bg-missing', 'text-on-missing')
    const wine = within(screen.getByRole('button', { name: /October 6,/ })).getByTestId(
      'alcohol-mark',
    )
    expect(wine).toHaveClass('text-alcohol')
    expect(
      within(screen.getByRole('button', { name: /October 6,/ })).getByTestId('weigh-in-mark'),
    ).toHaveClass('h-3', 'w-3')
  })

  test('tints the row of the current week only', () => {
    renderCalendar()

    const tinted = screen.getAllByTestId('week-row').filter((row) => row.dataset.current === 'true')
    expect(tinted).toHaveLength(1)
    expect(within(tinted[0]).getByRole('button', { name: 'Today, October 15' })).toBeInTheDocument()
  })
})
