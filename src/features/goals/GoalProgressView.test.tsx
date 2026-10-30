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

  test('fiber shows as its own goal with its own color', () => {
    const fiber = { ...PROTEIN, key: 'fiber' as const, consumed: 18, target: 30, incomplete: false }
    render(<GoalProgressView progress={[KCAL, fiber]} style="bars" />)

    const [, item] = items()
    expect(item).toHaveTextContent('Fiber')
    expect(item).toHaveTextContent('18.0 / 30 g')
    expect(item?.innerHTML).toContain('var(--goal-fiber)')
  })

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

  describe('when over', () => {
    const over = (key: GoalProgress['key'], ratio: number): GoalProgress => ({
      ...KCAL,
      key,
      ratio,
      consumed: ratio * 100,
      target: 100,
      remaining: 100 - ratio * 100,
      reached: ratio >= 1,
    })
    const strokeOf = (ring: Element) =>
      (ring.querySelectorAll('circle')[1] as SVGCircleElement | undefined)?.style.stroke ?? ''

    test.each([
      ['within the goal', 220, 'var(--goal-kcal)'],
      ['more than 10 % over', 221, 'var(--goal-over-full, var(--goal-kcal))'],
      ['more than 300 kcal over', 2400, 'var(--goal-over-well, var(--goal-kcal))'],
    ])('calories %s', (_name, consumed, stroke) => {
      const target = consumed === 2400 ? 2000 : 200
      render(
        <GoalProgressView progress={[{ ...over('kcal', 1), consumed, target }]} style="rings" />,
      )

      expect(strokeOf(screen.getByTestId('ring'))).toBe(stroke)
    })

    test('carbs, fat and protein keep their color when over', () => {
      render(
        <GoalProgressView
          progress={[over('carbs', 1.3), over('fat', 1.3), over('protein', 1.5)]}
          style="rings"
        />,
      )

      const [carbs, fat, protein] = screen.getAllByTestId('ring')
      expect(strokeOf(carbs!)).toBe('var(--goal-carbs)')
      expect(strokeOf(fat!)).toBe('var(--goal-fat)')
      expect(strokeOf(protein!)).toBe('var(--goal-protein)')
    })

    test('bars change the same way', () => {
      render(
        <GoalProgressView
          progress={[{ ...over('kcal', 1.2), consumed: 2400, target: 2000 }, over('carbs', 1.2)]}
          style="bars"
        />,
      )

      const [kcal, carbs] = screen.getAllByTestId('bar')
      expect((kcal!.firstElementChild as HTMLElement).style.backgroundColor).toBe(
        'var(--goal-over-well, var(--goal-kcal))',
      )
      expect((carbs!.firstElementChild as HTMLElement).style.backgroundColor).toBe(
        'var(--goal-carbs)',
      )
    })

    test('under the goal, nothing changes', () => {
      render(<GoalProgressView progress={[over('kcal', 0.99)]} style="rings" />)

      expect(strokeOf(screen.getByTestId('ring'))).toBe('var(--goal-kcal)')
    })

    test('a day that is left out (cheat or alcohol day) shows no over colors', () => {
      render(
        <GoalProgressView
          progress={[over('kcal', 1.2), over('fat', 1.05)]}
          style="rings"
          showOver={false}
        />,
      )

      const [kcal, fat] = screen.getAllByTestId('ring')
      expect(strokeOf(kcal!)).toBe('var(--goal-kcal)')
      expect(strokeOf(fat!)).toBe('var(--goal-fat)')
    })
  })

  describe('corner', () => {
    const corner = <div role="group" aria-label="Corner" />

    test.each(['rings', 'ringBars'] as const)(
      '%s: the corner is in the right column, above the caption and the figures',
      (style) => {
        render(<GoalProgressView progress={[KCAL]} style={style} corner={corner} />)
        const [kcal] = items()
        const group = within(kcal as HTMLElement).getByRole('group', { name: 'Corner' })
        const caption = within(kcal as HTMLElement).getByText('Calories')
        expect(
          group.compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy()
        expect(kcal).toHaveTextContent('913 / 2,000 kcal')
      },
    )

    test.each(['bars', 'compact'] as const)(
      '%s: the corner replaces the figure beside the number, which moves under the bar',
      (style) => {
        render(<GoalProgressView progress={[KCAL]} style={style} corner={corner} />)
        const [kcal] = items()
        const group = within(kcal as HTMLElement).getByRole('group', { name: 'Corner' })
        const bar = within(kcal as HTMLElement).getByTestId('bar')
        const figure = within(kcal as HTMLElement).getByText('913 / 2,000 kcal')
        expect(group.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(bar.compareDocumentPosition(figure) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        // screen readers still hear what the figure is about
        expect(figure.querySelector('.sr-only')).toHaveTextContent('Calories')
        expect(figure.parentElement).toHaveClass('text-right')
      },
    )

    test.each(['rings', 'ringBars', 'bars', 'compact'] as const)(
      '%s: without a corner nothing extra is drawn',
      (style) => {
        render(<GoalProgressView progress={[KCAL]} style={style} />)
        expect(screen.queryByRole('group', { name: 'Corner' })).toBeNull()
      },
    )
  })
})
