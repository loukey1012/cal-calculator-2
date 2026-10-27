import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { DishTotals } from './DishTotals'
import { testDish } from './testData'

const nameOf = (portionId: string) => (portionId === 'p-me' ? 'Lukas' : 'Baby')

describe('DishTotals', () => {
  test('adds the whole dish to the portions of two people', () => {
    render(<DishTotals dish={testDish()} nameOf={nameOf} />)

    // 400 g mince at 250 kcal/100 g, split equally
    expect(screen.getByText('Lukas')).toBeInTheDocument()
    expect(screen.getByText('Baby')).toBeInTheDocument()
    const whole = screen.getByRole('region', { name: 'Whole dish' })
    expect(within(whole).getByText('1,000 kcal')).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Per portion' })).queryByText('1,000 kcal'),
    ).toBeNull()
  })

  test('marks the whole dish as an estimate', () => {
    render(<DishTotals dish={testDish({ kcalEstimated: true })} nameOf={nameOf} />)

    expect(
      within(screen.getByRole('region', { name: 'Whole dish' })).getByText('~1,000 kcal'),
    ).toBeInTheDocument()
  })

  test('leaves the whole dish out with one portion', () => {
    const dish = testDish()
    render(<DishTotals dish={{ ...dish, portions: dish.portions.slice(0, 1) }} nameOf={nameOf} />)

    expect(screen.getByText('Lukas')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Whole dish' })).not.toBeInTheDocument()
  })
})
