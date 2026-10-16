import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { Slider } from './Slider'

describe('Slider', () => {
  test('dragging it never swipes tabs or pages', () => {
    render(<Slider label="Strength" min={0} max={10} value={5} onChange={vi.fn()} />)

    expect(
      screen.getByRole('slider', { name: 'Strength' }).closest('[data-swipe-lock]'),
    ).not.toBeNull()
  })
})
