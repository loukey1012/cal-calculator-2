import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { FlagChip } from './FlagChip'

const symbol = <svg data-testid="symbol" />

describe('FlagChip', () => {
  test('aria-pressed reflects on', () => {
    const { rerender } = render(
      <FlagChip label="Gym" symbol={symbol} color="gym" on={false} onPress={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Gym' })).toHaveAttribute('aria-pressed', 'false')
    rerender(<FlagChip label="Gym" symbol={symbol} color="gym" on onPress={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Gym' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('a popup chip is not a toggle: no aria-pressed, and the accessible name can carry the state', () => {
    render(
      <FlagChip
        label="Cheat meal"
        accessibleName="Cheat meal: Lunch"
        symbol={symbol}
        color="cheat"
        on
        onPress={vi.fn()}
        hasPopup
      />,
    )
    const button = screen.getByRole('button', { name: 'Cheat meal: Lunch' })
    expect(button).not.toHaveAttribute('aria-pressed')
    expect(button).toHaveClass('bg-cheat')
  })

  test('calls onPress when tapped', async () => {
    const onPress = vi.fn()
    render(<FlagChip label="Gym" symbol={symbol} color="gym" on={false} onPress={onPress} />)
    await userEvent.click(screen.getByRole('button', { name: 'Gym' }))
    expect(onPress).toHaveBeenCalledOnce()
  })

  test('does not fire when disabled', async () => {
    const onPress = vi.fn()
    render(
      <FlagChip label="Gym" symbol={symbol} color="gym" on={false} disabled onPress={onPress} />,
    )
    const button = screen.getByRole('button', { name: 'Gym' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onPress).not.toHaveBeenCalled()
  })

  test('is filled with its colour when on and outlined when off', () => {
    const { rerender } = render(
      <FlagChip label="Cheat day" symbol={symbol} color="cheat" on onPress={vi.fn()} />,
    )
    const on = screen.getByRole('button', { name: 'Cheat day' })
    expect(on).toHaveClass('bg-cheat', 'text-on-mark')
    rerender(
      <FlagChip label="Cheat day" symbol={symbol} color="cheat" on={false} onPress={vi.fn()} />,
    )
    const off = screen.getByRole('button', { name: 'Cheat day' })
    expect(off).not.toHaveClass('bg-cheat')
    expect(off).toHaveClass('text-label-secondary')
  })

  test('announces a popup and its state only with hasPopup', () => {
    const { rerender } = render(
      <FlagChip label="Cheat meal" symbol={symbol} color="cheat" on={false} onPress={vi.fn()} />,
    )
    const plain = screen.getByRole('button', { name: 'Cheat meal' })
    expect(plain).not.toHaveAttribute('aria-haspopup')
    expect(plain).not.toHaveAttribute('aria-expanded')
    rerender(
      <FlagChip
        label="Cheat meal"
        symbol={symbol}
        color="cheat"
        on={false}
        onPress={vi.fn()}
        hasPopup
        expanded
      />,
    )
    const popup = screen.getByRole('button', { name: 'Cheat meal' })
    expect(popup).toHaveAttribute('aria-haspopup', 'dialog')
    expect(popup).toHaveAttribute('aria-expanded', 'true')
  })

  test('forwards the ref to the button', () => {
    const ref = { current: null as HTMLButtonElement | null }
    render(
      <FlagChip ref={ref} label="Gym" symbol={symbol} color="gym" on={false} onPress={vi.fn()} />,
    )
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Gym' }))
  })
})
