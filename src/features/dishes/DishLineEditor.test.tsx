import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import { gramsItem } from './testData'
import { DishLineEditor } from './DishLineEditor'
import type { DishLine } from './portions'

const PORTIONS = [
  { id: 'p-me', name: 'Lukas' },
  { id: 'p-her', name: 'Baby' },
]

/** A line like buildDishLine makes it, for 350 kcal per 100 g; `estimated` marks the dish. */
function buildLine(
  input:
    | { allocation: 'shared'; amount: number }
    | { allocation: 'per_portion'; amounts: Record<string, number> },
  estimated: boolean,
): DishLine {
  const amounts = input.allocation === 'shared' ? {} : input.amounts
  const total =
    input.allocation === 'shared'
      ? input.amount
      : Object.values(amounts).reduce((sum, amount) => sum + amount, 0)
  if (total <= 0) throw new RangeError('Give at least one person an amount')
  const item = { ...gramsItem('Rice', total, 350), dish: { kcalEstimated: estimated } }
  return { id: 'l-rice', allocation: input.allocation, item, amounts }
}

function renderOwnAmounts(estimated = false) {
  render(
    <DishLineEditor
      title="Rice"
      units={['g']}
      portions={PORTIONS}
      initialWho={{ kind: 'own' }}
      confirmLabel="Add to dish"
      build={(input) => buildLine(input as never, estimated)}
      onConfirm={() => undefined}
    />,
  )
}

describe('own amounts', () => {
  test('shows each person’s calories and the total while typing', async () => {
    const user = userEvent.setup()
    renderOwnAmounts()

    await user.type(screen.getByLabelText('Lukas amount'), '120')
    await user.type(screen.getByLabelText('Baby amount'), '100')

    expect(screen.getByTestId('own-kcal-p-me')).toHaveTextContent('420 kcal')
    expect(screen.getByTestId('own-kcal-p-her')).toHaveTextContent('350 kcal')
    expect(screen.getByTestId('line-preview')).toHaveTextContent('Together 770 kcal')
  })

  test('shows a dash for a person without an amount', async () => {
    const user = userEvent.setup()
    renderOwnAmounts()

    await user.type(screen.getByLabelText('Lukas amount'), '120')

    expect(screen.getByTestId('own-kcal-p-me')).toHaveTextContent('420 kcal')
    expect(screen.getByTestId('own-kcal-p-her')).toHaveTextContent('–')
    expect(screen.getByTestId('line-preview')).toHaveTextContent('Together 420 kcal')
  })

  test('shows nothing but a dash while every amount is empty', () => {
    renderOwnAmounts()

    expect(screen.getByTestId('own-kcal-p-me')).toHaveTextContent('–')
    expect(screen.getByTestId('line-preview')).toHaveTextContent('–')
    expect(screen.getByTestId('line-preview')).not.toHaveTextContent('Together')
  })

  test('marks estimated calories with a tilde', async () => {
    const user = userEvent.setup()
    renderOwnAmounts(true)

    await user.type(screen.getByLabelText('Lukas amount'), '100')

    expect(screen.getByTestId('own-kcal-p-me')).toHaveTextContent('~350 kcal')
    expect(screen.getByTestId('line-preview')).toHaveTextContent('Together ~350 kcal')
  })
})

describe('accessibility of own amounts', () => {
  test('a person’s calories are the description of their amount field', async () => {
    const user = userEvent.setup()
    renderOwnAmounts()

    await user.type(screen.getByLabelText('Lukas amount'), '120')

    expect(screen.getByLabelText('Lukas amount')).toHaveAccessibleDescription('420 kcal')
  })

  test('without an amount the description says so instead of reading a dash', () => {
    renderOwnAmounts()

    expect(screen.getByLabelText('Baby amount')).toHaveAccessibleDescription('No amount')
  })

  test('the preview is announced when it changes', () => {
    renderOwnAmounts()

    expect(screen.getByTestId('line-preview')).toHaveAttribute('aria-live', 'polite')
  })
})
