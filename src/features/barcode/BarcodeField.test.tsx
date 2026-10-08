import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'

vi.mock('./BarcodeScanner', () => ({
  BarcodeScanner: ({ onResult }: { onResult: (barcode: string) => void }) => (
    <button type="button" onClick={() => onResult('3017620422003')}>
      Fake scan
    </button>
  ),
}))

import { BarcodeField } from './BarcodeField'

function Field({ error }: { readonly error?: string }) {
  const [value, setValue] = useState('')
  return <BarcodeField value={value} error={error} onChange={setValue} />
}

describe('BarcodeField', () => {
  test('the barcode can be typed or scanned into the field', async () => {
    const user = userEvent.setup()
    render(<Field />)
    const field = screen.getByLabelText('Barcode', { exact: true })

    await user.type(field, '9638')
    expect(field).toHaveValue('9638')
    await user.click(screen.getByRole('button', { name: 'Scan barcode' }))
    await user.click(screen.getByRole('button', { name: 'Fake scan' }))

    expect(field).toHaveValue('3017620422003')
    expect(screen.queryByRole('button', { name: 'Fake scan' })).not.toBeInTheDocument()
  })

  test('a problem is shown under the field and announced with it', () => {
    render(<Field error="Not a valid barcode" />)

    expect(screen.getByLabelText('Barcode', { exact: true })).toHaveAccessibleDescription(
      'Not a valid barcode',
    )
  })
})
