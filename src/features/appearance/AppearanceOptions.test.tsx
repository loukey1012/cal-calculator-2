import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { OptionCards } from './AppearanceOptions'

const OPTIONS = [
  { value: 'classic', label: 'Classic', preview: <span /> },
  { value: 'pink', label: 'Pink', preview: <span /> },
] as const

describe('OptionCards', () => {
  test('the selected card is framed with an outline, which Liquid Glass leaves alone', () => {
    render(<OptionCards label="Light style" options={OPTIONS} value="pink" onChange={vi.fn()} />)

    const selected = screen.getByRole('radio', { name: 'Pink' })
    const other = screen.getByRole('radio', { name: 'Classic' })

    // glass replaces box-shadow (where a ring lives), never the outline
    expect(selected).toHaveClass('outline-2', 'outline-offset-2', 'outline-accent-ink')
    expect(selected.className).not.toMatch(/\bring-/)
    expect(other).not.toHaveClass('outline-2')
  })
})
