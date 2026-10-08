import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { BrandField } from './BrandField'
import { ingredient } from './testData'

const SAVED = ['Clever', 'Coca-Cola', 'Rocco', 'Milbona'].map((brand) =>
  ingredient({ id: brand, name: brand, brand }),
)

function Form({ initial = '', onSubmit = vi.fn() }: { initial?: string; onSubmit?: () => void }) {
  const [brand, setBrand] = useState(initial)
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <BrandField value={brand} onChange={setBrand} savedIngredients={SAVED} />
      <output data-testid="value">{brand}</output>
    </form>
  )
}

const field = () => screen.getByRole('combobox', { name: 'Brand' })
const options = () => screen.queryAllByRole('option').map((option) => option.textContent)

describe('BrandField', () => {
  test('typing shows saved brands, starting ones first; tapping one fills it in', async () => {
    const user = userEvent.setup()
    render(<Form />)

    await user.type(field(), 'c')
    expect(options()).toEqual(['Clever', 'Coca-Cola', 'Rocco'])
    expect(field()).toHaveAttribute('aria-expanded', 'true')
    await user.click(screen.getByRole('option', { name: 'Clever' }))

    expect(screen.getByTestId('value')).toHaveTextContent('Clever')
    expect(options()).toEqual([])
    expect(field()).toHaveAttribute('aria-expanded', 'false')
  })

  test('a brand already filled in (e.g. from a scan) doesn’t open the list by itself', () => {
    render(<Form initial="Cl" />)

    expect(options()).toEqual([])
  })

  test('arrow keys and Enter pick a brand without sending the form; Escape closes', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<Form onSubmit={onSubmit} />)

    await user.type(field(), 'co')
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(screen.getByRole('option', { name: 'Rocco' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Enter}')
    expect(screen.getByTestId('value')).toHaveTextContent('Rocco')
    expect(onSubmit).not.toHaveBeenCalled()

    await user.clear(field())
    await user.type(field(), 'c')
    await user.keyboard('{Escape}')
    expect(options()).toEqual([])
  })

  test('a new brand can still be typed freely', async () => {
    const user = userEvent.setup()
    render(<Form />)

    await user.type(field(), 'Zott')

    expect(options()).toEqual([])
    expect(screen.getByTestId('value')).toHaveTextContent('Zott')
  })

  test('leaving the field closes the list', async () => {
    const user = userEvent.setup()
    render(<Form />)

    await user.type(field(), 'c')
    await user.tab()

    expect(options()).toEqual([])
  })
})
