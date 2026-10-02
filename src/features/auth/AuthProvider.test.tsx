import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render as baseRender, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('./authApi', () => ({ getSession: vi.fn(), onSessionChange: vi.fn() }))

import { getSession, onSessionChange } from './authApi'
import { useAuth } from './authContext'
import { AuthProvider } from './AuthProvider'

function Probe() {
  const auth = useAuth()
  return <p>{auth.status === 'signedIn' ? `in:${auth.session.user.id}` : auth.status}</p>
}

const SESSION = { user: { id: 'u1' } } as never

function render(ui: ReactElement) {
  return baseRender(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)
}

beforeEach(() => vi.clearAllMocks())

describe('AuthProvider', () => {
  test('starts loading, then reflects the stored session', async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION)
    vi.mocked(onSessionChange).mockReturnValue(() => {})

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(await screen.findByText('in:u1')).toBeInTheDocument()
  })

  test('follows later sign-out events and unsubscribes on unmount', async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION)
    const unsubscribe = vi.fn()
    vi.mocked(onSessionChange).mockReturnValue(unsubscribe)

    const { unmount } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await screen.findByText('in:u1')
    const listener = vi.mocked(onSessionChange).mock.calls[0]?.[0]
    act(() => listener?.(null))

    expect(screen.getByText('signedOut')).toBeInTheDocument()
    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })

  test('treats an unreadable stored session as signed out', async () => {
    vi.mocked(getSession).mockRejectedValue(new Error('corrupt storage'))
    vi.mocked(onSessionChange).mockReturnValue(() => {})

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    expect(await screen.findByText('signedOut')).toBeInTheDocument()
  })

  test('useAuth outside the provider fails loudly', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<Probe />)).toThrow(/inside AuthProvider/)
  })
})
