import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { DietMarks } from './dietSymbols'

describe('DietMarks', () => {
  test('shows each mark that applies with its word, hiding the drawing from screen readers', () => {
    const { container } = render(<DietMarks vegan halal />)

    // one label for the whole group, not a word per mark
    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(screen.getByRole('img', { name: 'vegan, halal' })).toBeInTheDocument()
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg).toHaveAttribute('aria-hidden', 'true')
      expect(svg).toHaveAttribute('viewBox', '0 0 12 12')
    }
  })

  test('shows only the one that applies', () => {
    render(<DietMarks vegan halal={false} />)

    expect(screen.getByRole('img', { name: 'vegan' })).toBeInTheDocument()
  })

  test('renders nothing when neither applies', () => {
    const { container } = render(<DietMarks vegan={false} halal={false} />)

    expect(container).toBeEmptyDOMElement()
  })
})
