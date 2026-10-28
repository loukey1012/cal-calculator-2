import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { DayStatusPill } from './DayStatusPill'
import type { DayStatusInput } from './dayStatusPill'

const INPUT: DayStatusInput = {
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

describe('DayStatusPill', () => {
  test('is tinted by its tone, with text darkened toward the label color by the day-pill class', () => {
    render(<DayStatusPill input={INPUT} />)

    const pill = screen.getByTestId('day-status')
    expect(pill).toHaveClass('day-pill')
    expect(pill.style.getPropertyValue('--pill-color')).toBe('var(--success)')
  })

  test('uses the over colors of the rings for a day over the goal', () => {
    render(<DayStatusPill input={{ ...INPUT, kcal: 2500 }} />)

    expect(screen.getByTestId('day-status').style.getPropertyValue('--pill-color')).toContain(
      '--goal-over-',
    )
  })

  test('paints nothing for a day without a verdict', () => {
    render(
      <DayStatusPill input={{ ...INPUT, day: { date: '2026-10-02', mealCount: 0 }, kcal: 0 }} />,
    )

    expect(screen.queryByTestId('day-status')).not.toBeInTheDocument()
  })
})
