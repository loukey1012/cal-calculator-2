import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { IngredientRow } from './IngredientRow'
import { ingredient } from './testData'

describe('IngredientRow', () => {
  test('marks a vegan and halal ingredient after its name', () => {
    render(
      <IngredientRow
        ingredient={ingredient({ name: 'Oats', kcal_100: 370, vegan: true, halal: true })}
        onClick={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /^Oats\s*vegan, halal/ })).toBeInTheDocument()
  })

  test('shows no mark for an ingredient without them', () => {
    render(<IngredientRow ingredient={ingredient({ name: 'Salami' })} onClick={vi.fn()} />)

    expect(screen.queryByRole('img', { name: /vegan/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /halal/ })).not.toBeInTheDocument()
  })
})
