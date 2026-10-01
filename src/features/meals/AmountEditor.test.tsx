import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { EMPTY_TOTALS } from '../nutrition/totals'
import { AmountEditor } from './AmountEditor'

function renderEditor(units: readonly ('g' | 'unit')[] = ['g'], initialAmount = '') {
  const onConfirm = vi.fn()
  const preview = vi.fn((amount: number) => ({ ...EMPTY_TOTALS, kcal: amount }))
  render(
    <AmountEditor
      title="Cream"
      units={units}
      unitLabel="Riegel"
      initialAmount={initialAmount}
      confirmLabel="Add"
      preview={preview}
      onConfirm={onConfirm}
    />,
  )
  return { onConfirm, preview }
}

describe('AmountEditor', () => {
  test('the stepper adds and removes 10 g at a time, never going to zero', async () => {
    const user = userEvent.setup()
    renderEditor(['g'], '15')

    await user.click(screen.getByRole('button', { name: 'More' }))
    expect(screen.getByLabelText('Amount')).toHaveValue('25')

    await user.click(screen.getByRole('button', { name: 'Less' }))
    await user.click(screen.getByRole('button', { name: 'Less' }))
    expect(screen.getByLabelText('Amount')).toHaveValue('5')

    await user.click(screen.getByRole('button', { name: 'Less' }))
    expect(screen.getByLabelText('Amount')).toHaveValue('5')
  })

  test('units step by one and show the unit name', async () => {
    const user = userEvent.setup()
    renderEditor(['g', 'unit'])

    await user.click(screen.getByRole('radio', { name: 'Riegel' }))
    await user.click(screen.getByRole('button', { name: 'More' }))

    expect(screen.getByLabelText('Amount')).toHaveValue('1')
    expect(screen.getByText('Riegel', { selector: 'span' })).toBeInTheDocument()
  })

  test('confirms a typed amount with comma decimals in the chosen unit', async () => {
    const user = userEvent.setup()
    const { onConfirm } = renderEditor(['g'])

    await user.type(screen.getByLabelText('Amount'), '12,5')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onConfirm).toHaveBeenCalledWith(12.5, 'g')
  })

  test('refuses amounts the preview cannot log', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <AmountEditor
        title="Cream"
        units={['g']}
        confirmLabel="Add"
        preview={() => null}
        onConfirm={onConfirm}
      />,
    )

    await user.type(screen.getByLabelText('Amount'), '0,0001')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText('Enter an amount')).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
