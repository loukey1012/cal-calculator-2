import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { ColorPicker } from './ColorPicker'

function renderPicker(value: string) {
  const onChange = vi.fn()
  render(<ColorPicker label="Accent color" value={value} onChange={onChange} />)
  const group = within(screen.getByRole('radiogroup', { name: 'Accent color' }))
  return { onChange, group }
}

describe('ColorPicker', () => {
  test('a preset is picked with one tap', async () => {
    const user = userEvent.setup()
    const { onChange, group } = renderPicker('#007aff')

    await user.click(group.getByRole('radio', { name: 'White' }))

    expect(onChange).toHaveBeenCalledWith('#ffffff')
  })

  test('marks the current preset, ignoring case', () => {
    const { group } = renderPicker('#007AFF')

    expect(group.getByRole('radio', { name: 'Blue' })).toHaveAttribute('aria-checked', 'true')
    expect(group.getByTestId('custom-color')).toHaveAttribute('data-selected', 'false')
  })

  test('moving through the system color picker only previews; "Use this color" saves it', async () => {
    // Arrange
    const user = userEvent.setup()
    const { onChange } = renderPicker('#007aff')
    const custom = screen.getByLabelText('Custom color')
    expect(screen.queryByRole('button', { name: 'Use this color' })).not.toBeInTheDocument()

    // Act: iOS reports colors while the finger moves, and on closing
    fireEvent.input(custom, { target: { value: '#111111' } })
    fireEvent.change(custom, { target: { value: '#ABCDEF' } })

    // Assert
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Custom color')).toBe(custom)
    await user.click(screen.getByRole('button', { name: 'Use this color' }))
    expect(onChange).toHaveBeenCalledWith('#abcdef')
  })

  test('picking a preset drops an unused custom color', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(<ColorPicker label="Color" value="#007aff" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Custom color'), { target: { value: '#111111' } })

    await user.click(screen.getByRole('radio', { name: 'White' }))
    rerender(<ColorPicker label="Color" value="#ffffff" onChange={onChange} />)

    expect(screen.queryByRole('button', { name: 'Use this color' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Custom color')).toHaveValue('#ffffff')
  })

  test('a color that is no preset shows as the custom choice', () => {
    const { group } = renderPicker('#123456')

    expect(group.queryAllByRole('radio', { checked: true })).toHaveLength(0)
    expect(group.getByLabelText('Custom color')).toHaveValue('#123456')
    expect(group.getByTestId('custom-color')).toHaveAttribute('data-selected', 'true')
  })

  test('white gets a thin edge, so it shows on a white card', () => {
    const { group } = renderPicker('#007aff')

    expect(group.getByRole('radio', { name: 'White' }).className).toMatch(/inset/)
    expect(group.getByRole('radio', { name: 'Blue' }).className).not.toMatch(/inset/)
  })
})
