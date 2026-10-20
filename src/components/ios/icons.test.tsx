import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { TodayIcon } from './icons'

describe('TodayIcon', () => {
  test('is the app icon: an open C ring with a dot at its opening, all in one color', () => {
    const { container } = render(<TodayIcon />)

    // no full (faded) ring: the C is a single open arc
    expect(container.querySelectorAll('circle[stroke-opacity]')).toHaveLength(0)
    const arcs = container.querySelectorAll('path')
    expect(arcs).toHaveLength(1)
    expect(arcs[0]?.getAttribute('d')).toMatch(/^M17\.75 7\.18A7\.5 7\.5 0 1 0 17\.75 16\.82$/)
    // the dot sits in the opening, on the right, in the icon's own color
    const dots = container.querySelectorAll('circle')
    expect(dots).toHaveLength(1)
    expect(Number(dots[0]?.getAttribute('cx'))).toBeGreaterThan(18)
    expect(dots[0]).toHaveAttribute('fill', 'currentColor')
  })
})
