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
      'Cheat day',
      'Alcohol day',
      'Cheat meal',
      'Lunch or dinner missing',
      'Has a note',
      'Weigh-in',
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

    expect(document.querySelector('.border-alcohol.text-alcohol')).not.toBeNull()
    const fork = document.querySelector('svg.text-label-secondary:not(.h-2\\.5)')
    expect(fork).not.toBeNull()
    expect(document.querySelector('.bg-missing.text-on-missing')).not.toBeNull()
    expect(document.querySelector('.bg-accent-ink')).not.toBeNull()
  })
})
