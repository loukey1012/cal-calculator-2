import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { WeekBar } from './WeekBar'

const WEEK = [
  '2026-10-19',
  '2026-10-20',
  '2026-10-21',
  '2026-10-22',
  '2026-10-23',
  '2026-10-24',
  '2026-10-25',
]

function renderBar(figures: { average: number | null; saved: number | null } | null) {
  const onOpen = vi.fn()
  render(<WeekBar week={WEEK} figures={figures} onOpen={onOpen} />)
  return { onOpen }
}

describe('WeekBar', () => {
  test('says the average and the calories saved', () => {
    renderBar({ average: 1930, saved: 2100 })

    expect(
      screen.getByRole('button', { name: 'Week 43, average 1,930 kcal, 2,100 kcal saved' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Week 43 · Ø 1,930 kcal · 2,100 kcal saved')).toBeVisible()
  })

  test('says surplus when more was eaten than burned', () => {
    renderBar({ average: 1930, saved: -900 })

    expect(
      screen.getByRole('button', { name: 'Week 43, average 1,930 kcal, 900 kcal surplus' }),
    ).toBeInTheDocument()
  })

  test('shows only the average without calories burned', () => {
    renderBar({ average: 1930, saved: null })

    expect(screen.getByRole('button', { name: 'Week 43, average 1,930 kcal' })).toBeInTheDocument()
  })

  test('says so when no day counted', () => {
    renderBar({ average: null, saved: null })

    expect(screen.getByRole('button', { name: 'Week 43, no counted days' })).toBeInTheDocument()
  })

  test('shows just the week while the days load', () => {
    renderBar(null)

    expect(screen.getByRole('button', { name: 'Week 43' })).toBeInTheDocument()
  })

  test('lets long text wrap instead of cutting it off', () => {
    renderBar({ average: 1930, saved: 2100 })

    expect(screen.getByText(/^Week 43 · Ø/)).not.toHaveClass('truncate')
  })

  test('is a touch target of at least 44 px that opens the week', async () => {
    const user = userEvent.setup()
    const { onOpen } = renderBar({ average: 1930, saved: 2100 })

    const bar = screen.getByRole('button', { name: /^Week 43/ })
    expect(bar).toHaveClass('min-h-11')
    await user.click(bar)

    expect(onOpen).toHaveBeenCalledWith(WEEK)
  })
})
