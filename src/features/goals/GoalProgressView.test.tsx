import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { GoalProgress } from '../nutrition/goals'
import { GoalProgressView } from './GoalProgressView'

const KCAL: GoalProgress = {
  key: 'kcal',
  consumed: 913,
  target: 2000,
  ratio: 0.4565,
  remaining: 1087,
  reached: false,
  incomplete: false,
  estimated: false,
}
const PROTEIN: GoalProgress = {
  key: 'protein',
  consumed: 55,
  target: 50,
  ratio: 1.1,
  remaining: -5,
  reached: true,
  incomplete: true,
  estimated: false,
}

function items() {
  return within(screen.getByRole('list', { name: 'Goals' })).getAllByRole('listitem')
}

describe('GoalProgressView', () => {
  test.each(['rings', 'ringBars', 'bars', 'compact'] as const)(
    '%s: one item per goal with consumed, target and what is left',
    (style) => {
      render(<GoalProgressView progress={[KCAL, PROTEIN]} style={style} />)

      const [kcal, protein] = items()
      expect(items()).toHaveLength(2)
      expect(kcal).toHaveTextContent('Calories')
      expect(kcal).toHaveTextContent('913 / 2,000 kcal')
      expect(kcal).toHaveTextContent('1,087 kcal left')
      expect(protein).toHaveTextContent('Protein')
      expect(protein).toHaveTextContent('≥ 55.0 / 50 g')
    },
  )

  test('shows when a goal is exceeded', () => {
    render(
      <GoalProgressView
        progress={[{ ...KCAL, consumed: 2100, remaining: -100, ratio: 1.05 }, PROTEIN]}
        style="rings"
      />,
    )

    expect(items()[0]).toHaveTextContent('100 kcal over')
    expect(items()[1]).toHaveTextContent('5.0 g over')
  })

  test('rings are filled in proportion, and full once the goal is reached', () => {
    render(<GoalProgressView progress={[KCAL, PROTEIN]} style="rings" />)

    const [kcalRing, proteinRing] = screen.getAllByTestId('ring')
    expect(kcalRing).toHaveAttribute('data-fill', '0.457')
    expect(proteinRing).toHaveAttribute('data-fill', '1')
  })

  test('the bar styles draw bars instead of rings', () => {
    render(<GoalProgressView progress={[KCAL, PROTEIN]} style="bars" />)

    expect(screen.queryByTestId('ring')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('bar').map((bar) => bar.dataset.fill)).toEqual(['0.457', '1'])
  })

  test('ring + bars: a ring for calories only, bars for the macros with their left line', () => {
    render(<GoalProgressView progress={[KCAL, PROTEIN]} style="ringBars" />)

    expect(screen.getAllByTestId('ring')).toHaveLength(1)
    expect(screen.getByTestId('ring')).toHaveAttribute('data-fill', '0.457')
    expect(screen.getAllByTestId('bar').map((bar) => bar.dataset.fill)).toEqual(['1'])
    expect(items()[1]).toHaveTextContent('5.0 g over')
  })
})
