import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { CalendarKey, KEY_SHOWN_STORAGE_KEY } from './CalendarKey'

beforeEach(() => localStorage.clear())

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

  test('hides and shows, and remembers the choice on the phone', async () => {
    const user = userEvent.setup()
    const first = render(<CalendarKey />)

    await user.click(screen.getByRole('button', { name: 'Hide key' }))
    expect(screen.queryByText('Cheat day')).not.toBeInTheDocument()
    first.unmount()

    render(<CalendarKey />)
    expect(screen.queryByText('Cheat day')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show key' }))
    expect(screen.getByText('Cheat day')).toBeInTheDocument()
    expect(localStorage.getItem(KEY_SHOWN_STORAGE_KEY)).toBe('true')
  })

  test('tells assistive technology what the button opens and whether it is open', async () => {
    const user = userEvent.setup()
    render(<CalendarKey />)

    const button = screen.getByRole('button', { name: 'Hide key' })
    expect(button).toHaveAttribute('aria-expanded', 'true')
    const controlled = document.getElementById(button.getAttribute('aria-controls') ?? '')
    expect(controlled).toContainElement(screen.getByText('Cheat day'))

    await user.click(button)

    expect(screen.getByRole('button', { name: 'Show key' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(document.getElementById(button.getAttribute('aria-controls') ?? '')).not.toBeNull()
  })

  test('draws its samples in the same themed colors as the cells', () => {
    render(<CalendarKey />)

    expect(document.querySelector('.border-alcohol.text-alcohol')).not.toBeNull()
    expect(document.querySelector('.text-star')).not.toBeNull()
    expect(document.querySelector('.bg-missing.text-on-missing')).not.toBeNull()
    expect(document.querySelector('.bg-accent-ink')).not.toBeNull()
  })

  test('still works when the storage is blocked', async () => {
    const user = userEvent.setup()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    render(<CalendarKey />)

    expect(screen.getByText('Cheat day')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hide key' }))
    expect(screen.queryByText('Cheat day')).not.toBeInTheDocument()
    vi.restoreAllMocks()
  })
})
