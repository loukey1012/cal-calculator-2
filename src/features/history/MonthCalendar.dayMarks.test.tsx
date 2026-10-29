import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { DayMarks } from './calendar'
import { MonthCalendar } from './MonthCalendar'

const NONE: DayMarks = {
  hasNote: false,
  weighed: false,
  estimated: false,
  gym: false,
  sex: false,
}

function renderWith(marks: Partial<DayMarks>, selectedDay: string | null = null) {
  render(
    <MonthCalendar
      month="2026-10-01"
      today="2026-10-15"
      selectedDay={selectedDay}
      statusOf={() => 'none'}
      marksOf={(date) => (date === '2026-10-06' ? { ...NONE, ...marks } : NONE)}
      onSelectDay={() => {}}
      onChangeMonth={() => {}}
    />,
  )
  return screen.getByRole('button', { name: /^October 6\b/ })
}

describe('gym and sex marks in the calendar', () => {
  test('a day without them shows neither', () => {
    const cell = renderWith({})
    expect(within(cell).queryByTestId('gym-mark')).not.toBeInTheDocument()
    expect(within(cell).queryByTestId('sex-mark')).not.toBeInTheDocument()
  })

  test('the marks sit in one centred bottom row, each in its own color', () => {
    const cell = renderWith({ weighed: true, hasNote: true, gym: true, sex: true })

    const row = within(cell).getByTestId('day-marks-row')
    expect(row).toHaveClass('flex', 'justify-center', 'gap-px')
    expect(within(row).getByTestId('weigh-in-mark')).toHaveClass('text-weigh')
    expect(within(row).getByTestId('note-dot')).toHaveClass('text-note')
    expect(within(row).getByTestId('gym-mark')).toHaveClass('text-gym')
    expect(within(row).getByTestId('sex-mark')).toHaveClass('text-heart')
  })

  test('all marks are 9 px symbols in the order weigh-in, note, gym, sex', () => {
    const cell = renderWith({ weighed: true, hasNote: true, gym: true, sex: true })

    const row = within(cell).getByTestId('day-marks-row')
    const ids = Array.from(row.children).map((child) => child.getAttribute('data-testid'))
    expect(ids).toEqual(['weigh-in-mark', 'note-dot', 'gym-mark', 'sex-mark'])
    for (const child of Array.from(row.children)) {
      expect(child).toHaveClass('h-[9px]', 'w-[9px]')
      expect(child).toHaveAttribute('stroke-width', '1.6')
    }
  })

  test('the gym mark is a dumbbell with two plates on each side', () => {
    const cell = renderWith({ gym: true })
    const path = within(cell).getByTestId('gym-mark').querySelector('path')
    expect(path).toHaveAttribute('d', 'M1 4.5v3M3.6 2.8v6.4M8.4 2.8v6.4M11 4.5v3M3.6 6h4.8')
  })

  test('the screen reader hears what the cell shows', () => {
    renderWith({ gym: true, sex: true, hasNote: true })
    expect(
      screen.getByRole('button', { name: 'October 6, has a note, gym, sex' }),
    ).toBeInTheDocument()
  })

  test('on the selected day all marks take the color of its text', () => {
    const cell = renderWith({ gym: true, sex: true }, '2026-10-06')
    for (const id of ['gym-mark', 'sex-mark']) {
      expect(within(cell).getByTestId(id)).toHaveClass('text-on-accent')
    }
  })

  test('without any mark, no bottom row is drawn', () => {
    const cell = renderWith({})
    expect(within(cell).queryByTestId('day-marks-row')).not.toBeInTheDocument()
  })

  test.each([
    ['cheatDay', 'cheat-day-mark'],
    ['alcoholDay', 'alcohol-mark'],
    ['missing', 'missing-dot'],
    ['cheatMeal', 'cheat-meal-mark'],
  ] as const)('on a %s the bottom row is the same as anywhere', (status, topRightId) => {
    render(
      <MonthCalendar
        month="2026-10-01"
        today="2026-10-15"
        selectedDay={null}
        statusOf={() => status}
        marksOf={(date) => (date === '2026-10-06' ? { ...NONE, gym: true, hasNote: true } : NONE)}
        onSelectDay={() => {}}
        onChangeMonth={() => {}}
      />,
    )
    const cell = screen.getByRole('button', { name: /^October 6\b/ })
    expect(within(cell).getByTestId('day-marks-row')).toHaveClass('inset-x-[2px]')
    expect(within(cell).getByTestId(topRightId)).toBeInTheDocument()
  })
})
