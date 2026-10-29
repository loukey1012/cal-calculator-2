import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { NoteEntryRow } from './NoteEntryRow'

describe('NoteEntryRow', () => {
  test('shows the preview of the note next to its caption', () => {
    render(<NoteEntryRow note={'Birthday at Oma’s\nwith cake'} label="Day" onOpen={() => {}} />)

    const row = screen.getByRole('button', { name: /^Day note: Birthday/ })
    expect(row).toHaveTextContent(/Birthday at Oma’s\s+with cake/)
    expect(screen.queryByText('Add a note')).not.toBeInTheDocument()
  })

  test.each([null, undefined, '', '   '])('says "Add a note" for %j', (note) => {
    render(<NoteEntryRow note={note} label="Day" onOpen={() => {}} />)

    expect(screen.getByText('Add a note')).toHaveClass('text-label-secondary')
  })

  test('the name says which note it is, so day and meal rows differ', () => {
    render(
      <>
        <NoteEntryRow note={null} label="Day" onOpen={() => {}} />
        <NoteEntryRow note="Soup" label="Dinner" onOpen={() => {}} />
      </>,
    )

    expect(screen.getByRole('button', { name: 'Day note: Add a note' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dinner note: Soup' })).toBeInTheDocument()
  })

  test('tapping it opens the note page', async () => {
    const onOpen = vi.fn()
    render(<NoteEntryRow note="x" label="Dinner" onOpen={onOpen} />)

    await userEvent.click(screen.getByRole('button', { name: 'Dinner note: x' }))

    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
