import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { CustomItemForm } from './CustomItemForm'

describe('CustomItemForm', () => {
  test('asks for the values in the order of a nutrition label', () => {
    render(<CustomItemForm confirmLabel="Add to dish" onConfirm={vi.fn()} />)

    const order = ['Calories', 'Fat', 'Carbs', 'Protein'].map((label) =>
      screen.getByLabelText(label),
    )
    order.slice(1).forEach((input, index) => {
      // each comes after the one before it
      expect(order[index]?.compareDocumentPosition(input)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    })
  })
})
