import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { Slider } from './Slider'

describe('Slider', () => {
  test('speaks the formatted value and ties the description to the slider', () => {
    render(
      <Slider
        label="Strength"
        min={0}
        max={100}
        value={50}
        format={(value) => `${value}%`}
        description="How strong it is."
        onChange={vi.fn()}
      />,
    )

    const slider = screen.getByRole('slider', { name: 'Strength' })
    expect(slider).toHaveAttribute('aria-valuetext', '50%')
    expect(slider).toHaveAccessibleDescription('How strong it is.')
  })

  test('has no description or value text when none is given', () => {
    render(<Slider label="Strength" min={0} max={10} value={5} onChange={vi.fn()} />)

    const slider = screen.getByRole('slider', { name: 'Strength' })
    expect(slider).not.toHaveAttribute('aria-describedby')
    expect(slider).not.toHaveAttribute('aria-valuetext')
  })

  test('dragging it never swipes tabs or pages', () => {
    render(<Slider label="Strength" min={0} max={10} value={5} onChange={vi.fn()} />)

    expect(
      screen.getByRole('slider', { name: 'Strength' }).closest('[data-swipe-lock]'),
    ).not.toBeNull()
  })
})
