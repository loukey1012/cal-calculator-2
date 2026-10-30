import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { FlagButton } from './FlagButton'

const symbol = <svg data-testid="symbol" />

describe('FlagButton', () => {
  test('aria-pressed reflects on', () => {
    const { rerender } = render(
      <FlagButton label="Gym" symbol={symbol} color="gym" on={false} onPress={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Gym' })).toHaveAttribute('aria-pressed', 'false')
    rerender(<FlagButton label="Gym" symbol={symbol} color="gym" on onPress={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Gym' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('off is an outline with the symbol in the colour, on is filled', () => {
    const { rerender } = render(
      <FlagButton label="Gym" symbol={symbol} color="gym" on={false} onPress={vi.fn()} />,
    )
    const off = screen.getByRole('button', { name: 'Gym' })
    expect(off).toHaveClass('border-separator', 'text-gym')
    expect(off).not.toHaveClass('bg-gym')
    rerender(<FlagButton label="Gym" symbol={symbol} color="gym" on onPress={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Gym' })).toHaveClass('bg-gym', 'text-on-mark')
  })

  test('is round, 30 px, with an enlarged tap area and no visible text', () => {
    render(<FlagButton label="Gym" symbol={symbol} color="gym" on={false} onPress={vi.fn()} />)
    const button = screen.getByRole('button', { name: 'Gym' })
    expect(button).toHaveClass('h-[30px]', 'w-[30px]', 'rounded-full')
    expect(button.className).toContain('before:-inset-y-[7px]')
    expect(button).toHaveTextContent('')
  })

  test('a popup button is not a toggle: no aria-pressed, and it reports expanded', () => {
    render(
      <FlagButton
        label="Cheat: Lunch"
        symbol={symbol}
        color="cheat"
        on
        onPress={vi.fn()}
        hasPopup
        expanded
      />,
    )
    const button = screen.getByRole('button', { name: 'Cheat: Lunch' })
    expect(button).not.toHaveAttribute('aria-pressed')
    expect(button).toHaveAttribute('aria-haspopup', 'dialog')
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  test('a tap calls onPress, unless disabled', async () => {
    const onPress = vi.fn()
    const { rerender } = render(
      <FlagButton label="Gym" symbol={symbol} color="gym" on={false} onPress={onPress} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Gym' }))
    expect(onPress).toHaveBeenCalledOnce()
    rerender(
      <FlagButton label="Gym" symbol={symbol} color="gym" on={false} onPress={onPress} disabled />,
    )
    expect(screen.getByRole('button', { name: 'Gym' })).toBeDisabled()
  })
})
