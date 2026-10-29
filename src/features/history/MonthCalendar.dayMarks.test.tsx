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

  test('a gym day shows a dumbbell and a sex day a heart, together in the bottom row', () => {
    const cell = renderWith({ gym: true, sex: true })

    const pair = within(cell).getByTestId('day-marks-pair')
    expect(within(cell).getByTestId('day-marks-row')).toContainElement(pair)
    expect(within(pair).getByTestId('gym-mark')).toHaveClass('text-label-secondary')
    expect(within(pair).getByTestId('sex-mark')).toHaveClass('text-heart')
  })

  test('the screen reader hears what the cell shows', () => {
    renderWith({ gym: true, sex: true, hasNote: true })
    expect(
      screen.getByRole('button', { name: 'October 6, has a note, gym, sex' }),
    ).toBeInTheDocument()
  })

  test('on the selected day both marks take the color of its text', () => {
    const cell = renderWith({ gym: true, sex: true }, '2026-10-06')
    expect(within(cell).getByTestId('gym-mark')).toHaveClass('text-on-accent')
    expect(within(cell).getByTestId('sex-mark')).toHaveClass('text-on-accent')
  })

  // The bottom marks share one flex row (weigh-in left, note dot in the middle, pair right), so
  // the dot can never overlap them whatever the cell's border. The row is inset from the padding
  // box, which is 4 px narrower on an outlined cell (border-2).
  const FILLED = 'none' as const
  const OUTLINED = 'cheatDay' as const
  const COMBINATIONS = [
    ['note + gym + sex', { hasNote: true, gym: true, sex: true }],
    ['note + gym + sex + weigh-in', { hasNote: true, gym: true, sex: true, weighed: true }],
    ['note + gym', { hasNote: true, gym: true }],
    ['note + sex', { hasNote: true, sex: true }],
    ['weigh-in + note', { hasNote: true, weighed: true }],
    ['note alone', { hasNote: true }],
  ] as const

  function renderCell(
    status: 'none' | 'cheatDay' | 'alcoholDay',
    marks: Partial<DayMarks>,
    selectedDay: string | null,
  ) {
    render(
      <MonthCalendar
        month="2026-10-01"
        today="2026-10-15"
        selectedDay={selectedDay}
        statusOf={() => status}
        marksOf={(date) => (date === '2026-10-06' ? { ...NONE, ...marks } : NONE)}
        onSelectDay={() => {}}
        onChangeMonth={() => {}}
      />,
    )
    return screen.getByRole('button', { name: /^October 6\b/ })
  }

  describe.each([
    ['a filled cell', FILLED, null, 'inset-x-[3px]'],
    ['an outlined cheat day', OUTLINED, null, 'inset-x-[1px]'],
    ['an outlined alcohol day', 'alcoholDay' as const, null, 'inset-x-[1px]'],
    ['the selected day', FILLED, '2026-10-06', 'inset-x-[3px]'],
    ['the selected day that was a cheat day (no border)', OUTLINED, '2026-10-06', 'inset-x-[3px]'],
  ])('on %s', (_cell, status, selectedDay, inset) => {
    test.each(COMBINATIONS)('%s: one row keeps the marks apart', (_name, marks) => {
      const cell = renderCell(status, marks, selectedDay)

      const row = within(cell).getByTestId('day-marks-row')
      expect(row).toHaveClass('flex', 'justify-between', inset)
      const children = Array.from(row.children)
      const dot = within(cell).getByTestId('note-dot')
      const middle = children.find((child) => child.contains(dot))
      expect(middle).toHaveClass('flex-1')
      // order: weigh-in, the middle with the dot, the pair
      const scale = within(cell).queryByTestId('weigh-in-mark')
      const pair = within(cell).queryByTestId('day-marks-pair')
      const expected = [scale, middle, pair].filter((child) => child != null)
      expect(children).toEqual(expected)
    })
  })

  test('without a note, no dot is drawn', () => {
    const cell = renderCell(FILLED, { gym: true, sex: true }, null)
    expect(within(cell).queryByTestId('note-dot')).not.toBeInTheDocument()
  })
})
