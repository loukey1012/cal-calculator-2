import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { TodayPage } from './TodayPage'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-01T12:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('TodayPage', () => {
  test('shows today’s date and the four meals of the day', () => {
    render(<TodayPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
    expect(screen.getByText(/Thursday/)).toHaveTextContent(/October/)
    for (const meal of ['Breakfast', 'Lunch', 'Dinner', 'Snacks']) {
      expect(screen.getByText(meal)).toBeInTheDocument()
    }
  })
})
