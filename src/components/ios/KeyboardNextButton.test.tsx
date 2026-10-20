import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef } from 'react'
import { describe, expect, test } from 'vitest'
import { KeyboardNextButton } from './KeyboardNextButton'

function Form() {
  const form = useRef<HTMLFormElement>(null)
  return (
    <form ref={form}>
      <input aria-label="Name" />
      <input aria-label="Calories" inputMode="decimal" />
      <input aria-label="Fat" inputMode="decimal" />
      <input aria-label="Protein" inputMode="decimal" disabled />
      <KeyboardNextButton container={form} />
    </form>
  )
}

describe('KeyboardNextButton', () => {
  test('on a value field, Next moves to the next one; Done on the last closes the keyboard', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<Form />)

    // Act + Assert
    await user.click(screen.getByLabelText('Calories'))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByLabelText('Fat')).toHaveFocus()

    // the disabled field is skipped: Fat is the last one
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByLabelText('Fat')).not.toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
  })

  test('other fields get no button', async () => {
    const user = userEvent.setup()
    render(<Form />)

    await user.click(screen.getByLabelText('Name'))

    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })

  test('it goes away when the field loses focus', async () => {
    const user = userEvent.setup()
    render(<Form />)
    await user.click(screen.getByLabelText('Calories'))

    act(() => (screen.getByLabelText('Calories') as HTMLInputElement).blur())

    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })
})
