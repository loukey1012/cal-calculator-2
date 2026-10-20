import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test } from 'vitest'
import { SearchField } from './SearchField'

function Search({ initial }: { readonly initial: string }) {
  const [value, setValue] = useState(initial)
  return <SearchField label="Search ingredients" value={value} onChange={setValue} />
}

describe('SearchField', () => {
  test('the clear button empties the search and keeps the cursor there', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<Search initial="gouda" />)

    // Act
    await user.click(screen.getByRole('button', { name: 'Clear search' }))

    // Assert
    const field = screen.getByRole('searchbox', { name: 'Search ingredients' })
    expect(field).toHaveValue('')
    expect(field).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument()
  })

  test('an empty search shows no clear button', () => {
    render(<Search initial="" />)

    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument()
  })
})
