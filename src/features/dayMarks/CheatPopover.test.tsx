import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import type { MealType } from '../meals/dayModel'
import { CheatPopover } from './CheatPopover'

function Harness(props: {
  readonly wholeDay?: boolean
  readonly cheatMeals: ReadonlySet<MealType>
  readonly onToggleWholeDay?: () => void
  readonly onToggleMeal?: (meal: MealType) => void
  readonly onClose?: () => void
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  return (
    <div>
      <button ref={setAnchor}>Anchor</button>
      <CheatPopover
        open
        anchor={anchor}
        wholeDay={props.wholeDay ?? false}
        cheatMeals={props.cheatMeals}
        onToggleWholeDay={props.onToggleWholeDay ?? vi.fn()}
        onToggleMeal={props.onToggleMeal ?? vi.fn()}
        onClose={props.onClose ?? vi.fn()}
      />
    </div>
  )
}

describe('CheatPopover', () => {
  test('lists Whole day, a separator, then the four meals', () => {
    render(<Harness cheatMeals={new Set<MealType>()} />)
    const dialog = screen.getByRole('dialog', { name: 'Cheat' })
    const children = Array.from(dialog.children)
    expect(children.map((child) => child.getAttribute('role') ?? child.textContent)).toEqual([
      'Whole day',
      'separator',
      'Breakfast',
      'Lunch',
      'Dinner',
      'Snacks',
    ])
  })

  test('shows the pressed state of each row', () => {
    render(<Harness wholeDay cheatMeals={new Set<MealType>(['lunch'])} />)
    const states = ['Whole day', 'Breakfast', 'Lunch', 'Dinner', 'Snacks'].map((name) =>
      screen.getByRole('button', { name }).getAttribute('aria-pressed'),
    )
    expect(states).toEqual(['true', 'false', 'true', 'false', 'false'])
  })

  test('ticks are independent and the popover stays open', async () => {
    const onToggleWholeDay = vi.fn()
    const onToggleMeal = vi.fn()
    const onClose = vi.fn()
    render(
      <Harness
        cheatMeals={new Set<MealType>()}
        onToggleWholeDay={onToggleWholeDay}
        onToggleMeal={onToggleMeal}
        onClose={onClose}
      />,
    )
    const dialog = screen.getByRole('dialog', { name: 'Cheat' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Snacks' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Whole day' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Dinner' }))
    expect(onToggleMeal.mock.calls.map(([meal]) => meal)).toEqual(['snack', 'dinner'])
    expect(onToggleWholeDay).toHaveBeenCalledOnce()
    expect(onClose).not.toHaveBeenCalled()
  })
})
