import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { DayNoteCard } from './DayNoteCard'

test('keeps the line breaks of a note with several lines', () => {
  render(<DayNoteCard note={'Birthday\nat Oma’s'} />)

  expect(screen.getByRole('group', { name: 'Note' })).toHaveTextContent('Birthday at Oma’s')
  expect(screen.getByText(/Birthday/)).toHaveClass('whitespace-pre-line')
})
