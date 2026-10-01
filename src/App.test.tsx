import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import App from './App'

describe('App shell', () => {
  test('renders the app name as the large title', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'CALculator2' })).toBeInTheDocument()
  })
})
