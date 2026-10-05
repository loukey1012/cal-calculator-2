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
    // the bar row itself keeps the title clear of the iOS status bar fade
    expect(screen.getByRole('banner')).toHaveClass('pt-3')
  })

  test('leaves out the empty bar row when there are no buttons, to save height', () => {
    render(<PageHeader title="Today" subtitle="Monday, 5 October" />)

    expect(screen.queryByTestId('page-header-bar')).not.toBeInTheDocument()
    expect(screen.getByText('Monday, 5 October')).toBeInTheDocument()
  })

  test('without buttons, extra room keeps the date clear of the iOS status bar fade', () => {
    render(<PageHeader title="Today" subtitle="Monday, 5 October" />)

    expect(screen.getByRole('banner')).toHaveClass('pt-6')
  })
})
