import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { CalendarKey } from './CalendarKey'

describe('CalendarKey', () => {
  test('explains the colors and symbols', () => {
    render(<CalendarKey />)

    for (const text of [
      'Within goal (≤ 10 % over)',
      'More than 10 % over',
      'More than 300 kcal over',
      'Day that does not count',
      'Cheat day',
      'Alcohol day',
      'Lunch or dinner missing',
      'Cheat meal',
      'Has a note',
      'Weigh-in',
      'Gym',
      'Sex',
      'Estimated calories',
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument()
    }
  })

  test('has no button of its own: the options menu shows and hides it', () => {
    render(<CalendarKey />)

    expect(screen.getByRole('heading', { name: 'Key' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('draws its samples in the same themed colors as the cells', () => {
    render(<CalendarKey />)

    expect(document.querySelector('.bg-fill')).not.toBeNull()
    expect(document.querySelector('.bg-alcohol.text-on-missing')).not.toBeNull()
    expect(document.querySelector('.bg-cheat.text-on-missing')).not.toBeNull()
    expect(document.querySelector('.bg-missing.text-on-missing')).not.toBeNull()
    expect(document.querySelector('svg.text-cheat')).not.toBeNull()
    for (const color of ['weigh', 'note', 'gym', 'heart']) {
      expect(document.querySelector(`svg.text-${color}`)).not.toBeNull()
    }
  })

  test('has no dashed outline samples anymore', () => {
    render(<CalendarKey />)
    expect(document.querySelector('[class*="dashed"]')).toBeNull()
  })
})
