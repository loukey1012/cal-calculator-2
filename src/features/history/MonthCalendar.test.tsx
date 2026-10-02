import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { MonthCalendar } from './MonthCalendar'

function renderCalendar() {
  const onSelectDay = vi.fn()
  const onChangeMonth = vi.fn()
  render(
    <MonthCalendar
      month="2026-10-01"
      today="2026-10-15"
      selectedDay="2026-10-02"
      statusOf={(date) =>
        date === '2026-10-01' ? 'onTarget' : date === '2026-10-02' ? 'over' : 'none'
      }
      onSelectDay={onSelectDay}
      onChangeMonth={onChangeMonth}
    />,
  )
  return { onSelectDay, onChangeMonth }
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

  test('moves between months', async () => {
    const user = userEvent.setup()
    const { onChangeMonth } = renderCalendar()

    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(onChangeMonth).toHaveBeenCalledWith('2026-09-01')
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
  })
})
