import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test } from 'vitest'
import { InputRow } from './FormRows'
import { TextField } from './TextField'

function Weight() {
  const [value, setValue] = useState('72,4')
  return (
    <InputRow label="Weight" value={value} onChange={(event) => setValue(event.target.value)} />
  )
}

describe('clear buttons in fields', () => {
  test('a field with text can be emptied with its ×, keeping the cursor there', async () => {
    const user = userEvent.setup()
    render(<Weight />)

    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(screen.getByLabelText('Weight')).toHaveValue('')
    expect(screen.getByLabelText('Weight')).toHaveFocus()
    // nothing left to clear
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
  })

  test('a field that isn’t controlled shows its × once something is typed', async () => {
    const user = userEvent.setup()
    render(<TextField label="Recipe name" />)
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Recipe name'), 'Toast')
    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(screen.getByLabelText('Recipe name')).toHaveValue('')
  })

  test('date fields keep iOS’s own picker, without a ×', () => {
    render(<InputRow label="Day" type="date" value="2026-10-21" onChange={() => {}} />)

    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
  })
})
