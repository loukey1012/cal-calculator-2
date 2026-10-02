import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { GoalProgress } from '../nutrition/goals'
import { GoalRings } from './GoalRings'

const KCAL: GoalProgress = {
  key: 'kcal',
  consumed: 913,
  target: 2000,
  ratio: 0.4565,
  remaining: 1087,
  reached: false,
  incomplete: false,
}
const PROTEIN: GoalProgress = {
  key: 'protein',
  consumed: 55,
  target: 50,
  ratio: 1.1,
  remaining: -5,
  reached: true,
  incomplete: true,
}

describe('GoalRings', () => {
  test('one ring and legend row per goal, with consumed, target and what is left', () => {
    render(<GoalRings progress={[KCAL, PROTEIN]} />)

    const rows = within(screen.getByRole('list', { name: 'Goals' })).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Calories')
    expect(rows[0]).toHaveTextContent('913 / 2,000 kcal')
    expect(rows[0]).toHaveTextContent('1,087 kcal left')
    expect(screen.getAllByTestId('ring')).toHaveLength(2)
  })

  test('shows when a goal is exceeded and when the total is only a lower bound', () => {
    render(<GoalRings progress={[KCAL, PROTEIN]} />)

    const protein = screen.getAllByRole('listitem')[1]
    expect(protein).toHaveTextContent('≥ 55.0 / 50 g')
    expect(protein).toHaveTextContent('5.0 g over')
  })

  test('a ring is filled in proportion, and full once the goal is reached', () => {
    render(<GoalRings progress={[KCAL, PROTEIN]} />)

    const [kcalRing, proteinRing] = screen.getAllByTestId('ring')
    expect(kcalRing).toHaveAttribute('data-fill', '0.457')
    expect(proteinRing).toHaveAttribute('data-fill', '1')
  })
})
