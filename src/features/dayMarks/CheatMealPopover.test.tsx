import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import type { MealType } from '../meals/dayModel'
import { CheatMealPopover } from './CheatMealPopover'

function Harness(props: {
  readonly cheatMeals: ReadonlySet<MealType>
  readonly onToggle: (meal: MealType) => void
  readonly onClose: () => void
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  return (
    <div>
      <button ref={setAnchor}>Anchor</button>
      <CheatMealPopover open anchor={anchor} {...props} />
    </div>
  )
}

describe('CheatMealPopover', () => {
  test('shows the four meals with their pressed state', () => {
    render(
      <Harness cheatMeals={new Set<MealType>(['lunch'])} onToggle={vi.fn()} onClose={vi.fn()} />,
    )
    const dialog = screen.getByRole('dialog', { name: 'Cheat meals' })
    expect(dialog).toBeInTheDocument()
    const states = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map((name) =>
      screen.getByRole('button', { name }).getAttribute('aria-pressed'),
    )
    expect(states).toEqual(['false', 'true', 'false', 'false'])
  })

  test('a tap toggles that meal and leaves the popover open', async () => {
    const onToggle = vi.fn()
    const onClose = vi.fn()
    render(<Harness cheatMeals={new Set<MealType>()} onToggle={onToggle} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Snacks' }))
    await userEvent.click(screen.getByRole('button', { name: 'Dinner' }))
    expect(onToggle).toHaveBeenNthCalledWith(1, 'snack')
    expect(onToggle).toHaveBeenNthCalledWith(2, 'dinner')
    expect(onClose).not.toHaveBeenCalled()
  })
})
