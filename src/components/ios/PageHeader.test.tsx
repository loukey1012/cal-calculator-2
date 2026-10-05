import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  test('shows the bar buttons above the title', () => {
    render(<PageHeader title="Ingredients" action={<button type="button">Add</button>} />)

    expect(screen.getByTestId('page-header-bar')).toContainElement(
      screen.getByRole('button', { name: 'Add' }),
    )
    expect(screen.getByRole('heading', { name: 'Ingredients' })).toBeInTheDocument()
  })

  test('leaves out the empty bar row when there are no buttons, to save height', () => {
    render(<PageHeader title="Today" subtitle="Monday, 5 October" />)

    expect(screen.queryByTestId('page-header-bar')).not.toBeInTheDocument()
    expect(screen.getByText('Monday, 5 October')).toBeInTheDocument()
  })
})
