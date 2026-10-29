import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import type { DayStatus } from './calendar'
import { YearOverview } from './YearOverview'

const TODAY = '2026-10-15'

function renderYear(overrides: Partial<Parameters<typeof YearOverview>[0]> = {}) {
  const props = {
    year: 2026,
    today: TODAY,
    statusOf: (): DayStatus => 'none',
    onOpenMonth: vi.fn(),
    onChangeYear: vi.fn(),
    ...overrides,
  }
  render(<YearOverview {...props} />)
  return props
}

const cell = (date: string) => document.querySelector(`[data-date="${date}"]`)

describe('YearOverview', () => {
  test('shows the year and twelve months, each a button named with its month and year', () => {
    renderYear()

    expect(screen.getByRole('heading', { level: 2, name: '2026' })).toBeInTheDocument()
    const months = screen.getAllByRole('button', { name: /^\w+ 2026$/ })
    expect(months).toHaveLength(12)
    expect(months[0]).toHaveAccessibleName('January 2026')
    expect(months[11]).toHaveAccessibleName('December 2026')
  })

  test('draws every day of the months as a small cell, hidden from screen readers', () => {
    renderYear()

    expect(document.querySelectorAll('[data-date^="2026-10-"]')).toHaveLength(31)
    expect(document.querySelectorAll('[data-date^="2026-02-"]')).toHaveLength(28)
    expect(cell('2026-10-01')?.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(screen.queryAllByRole('button', { name: /October 1\b/ })).toHaveLength(0)
  })

  test('colors each day by the status it is given', () => {
    renderYear({
      statusOf: (date) =>
        date === '2026-10-01' ? 'onTarget' : date === '2026-10-02' ? 'alcoholDay' : 'none',
    })

    expect(cell('2026-10-01')).toHaveAttribute('data-status', 'onTarget')
    expect(cell('2026-10-01')).toHaveClass('bg-success/25')
    expect(cell('2026-10-02')).toHaveAttribute('data-status', 'alcoholDay')
    expect(cell('2026-10-02')).toHaveClass('bg-alcohol/25')
    expect(cell('2026-10-02')).not.toHaveClass('border-dashed')
    expect(cell('2026-10-03')).toHaveAttribute('data-status', 'none')
  })

  test('rings today and leaves the other days plain', () => {
    renderYear()

    expect(cell(TODAY)).toHaveClass('ring-1', 'ring-inset')
    expect(cell('2026-10-14')).not.toHaveClass('ring-1')
  })

  test('fades the days the filter does not match', () => {
    renderYear({ fadedOf: (date) => date !== '2026-10-01' })

    expect(cell('2026-10-01')).not.toHaveAttribute('data-faded')
    expect(cell('2026-10-02')).toHaveAttribute('data-faded', 'true')
  })

  test('tapping a month opens it', async () => {
    const user = userEvent.setup()
    const props = renderYear()

    await user.click(screen.getByRole('button', { name: 'October 2026' }))

    expect(props.onOpenMonth).toHaveBeenCalledWith('2026-10-01')
  })

  test('the arrows turn the year', async () => {
    const user = userEvent.setup()
    const props = renderYear()

    await user.click(screen.getByRole('button', { name: 'Previous year' }))
    expect(props.onChangeYear).toHaveBeenLastCalledWith(2025)
  })

  test('there is no next year beyond the current one', async () => {
    const user = userEvent.setup()
    const props = renderYear()

    const next = screen.getByRole('button', { name: 'Next year' })
    expect(next).toBeDisabled()
    await user.click(next)
    expect(props.onChangeYear).not.toHaveBeenCalled()
  })

  test('an earlier year has a next year', async () => {
    const user = userEvent.setup()
    const props = renderYear({ year: 2025 })

    await user.click(screen.getByRole('button', { name: 'Next year' }))

    expect(props.onChangeYear).toHaveBeenCalledWith(2026)
  })

  test('the previous year stops at the first year', () => {
    renderYear({ year: 2000 })

    expect(screen.getByRole('button', { name: 'Previous year' })).toBeDisabled()
  })

  test('is busy and dimmed while loading', () => {
    renderYear({ loading: true })

    const section = screen.getByRole('heading', { name: '2026' }).closest('section')!
    expect(section).toHaveAttribute('aria-busy', 'true')
    expect(cell('2026-10-01')?.closest('.grid.grid-cols-3')).toHaveClass('opacity-60')
  })

  test('tells the unjudged days apart in the minis', () => {
    const statuses: Record<string, DayStatus> = {
      '2026-10-01': 'missing',
      '2026-10-02': 'cheatMeal',
      '2026-10-03': 'logged',
      '2026-10-04': 'cheatDay',
      '2026-10-05': 'alcoholDay',
    }
    renderYear({ statusOf: (date) => statuses[date] ?? 'none' })

    expect(cell('2026-10-01')).toHaveClass('bg-fill')
    expect(cell('2026-10-02')).toHaveClass('bg-cheat/25')
    expect(cell('2026-10-03')).toHaveClass('bg-fill')
    expect(cell('2026-10-04')).toHaveClass('bg-cheat/25')
    expect(cell('2026-10-05')).toHaveClass('bg-alcohol/25')
    for (const date of ['2026-10-01', '2026-10-02', '2026-10-04', '2026-10-05']) {
      expect(cell(date)?.className).not.toMatch(/dashed|\bborder\b/)
    }
  })
})
