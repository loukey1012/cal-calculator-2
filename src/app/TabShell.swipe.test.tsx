import { act, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { useLocation } from 'react-router'
import { renderWithProviders } from '../test/render'
import { CurrentUserContext } from './currentUser'

// jsdom can't do layout, so drive TabShell through a fake Embla API instead of real gestures
const embla = vi.hoisted(() => {
  const handlers = new Map<string, () => void>()
  const state = { snap: 0, options: {} as Record<string, unknown> }
  const api = {
    on: vi.fn((event: string, handler: () => void) => handlers.set(event, handler)),
    off: vi.fn((event: string) => handlers.delete(event)),
    selectedScrollSnap: vi.fn(() => state.snap),
    scrollTo: vi.fn((index: number) => {
      state.snap = index
    }),
  }
  return { handlers, state, api }
})

vi.mock('embla-carousel-react', () => ({
  default: (options: Record<string, unknown>) => {
    embla.state.options = options
    return [vi.fn(), embla.api]
  },
}))
vi.mock('../features/household/householdApi', () => ({
  fetchHousehold: vi.fn(() => new Promise(() => {})),
  fetchMembers: vi.fn(() => new Promise(() => {})),
}))
vi.mock('../features/auth/authApi', () => ({ signOut: vi.fn() }))

import { TabShell } from './TabShell'

const PROFILE = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  created_at: '',
  updated_at: '',
}

function LocationProbe() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

function renderShell(route: string) {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: PROFILE, householdId: 'h1' }}>
      <TabShell />
      <LocationProbe />
    </CurrentUserContext>,
    { route },
  )
}

function swipeTo(index: number) {
  embla.state.snap = index
  act(() => embla.handlers.get('select')?.())
}

beforeEach(() => {
  vi.clearAllMocks()
  embla.handlers.clear()
  embla.state.snap = 0
})

describe('TabShell swiping', () => {
  test('starts the carousel on the tab from the URL', () => {
    renderShell('/ingredients')

    expect(embla.state.options).toMatchObject({ startIndex: 2 })
  })

  test('a swipe that settles on another page updates the URL', () => {
    renderShell('/today')

    swipeTo(1)

    expect(screen.getByTestId('path')).toHaveTextContent('/history')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('History')
  })

  test('a swipe does not change the carousel options (that would re-init and cut the animation)', () => {
    renderShell('/today')
    const optionsBefore = embla.state.options

    swipeTo(1)

    expect(embla.state.options).toEqual(optionsBefore)
  })

  test('settling on the current page keeps a nested URL', () => {
    renderShell('/history/2026-10-01')

    swipeTo(1)

    expect(screen.getByTestId('path')).toHaveTextContent('/history/2026-10-01')
  })

  test('gestures starting inside a swipe lock do not switch tabs', () => {
    renderShell('/today')
    const watchDrag = embla.state.options.watchDrag as (api: unknown, event: Event) => boolean
    const locked = document.createElement('div')
    locked.setAttribute('data-swipe-lock', '')
    const inner = document.createElement('span')
    locked.append(inner)

    expect(watchDrag(embla.api, { target: inner } as unknown as Event)).toBe(false)
    expect(watchDrag(embla.api, { target: document.body } as unknown as Event)).toBe(true)
  })

  test('stops listening when unmounted', () => {
    const { unmount } = renderShell('/today')

    unmount()

    expect(embla.api.off).toHaveBeenCalledWith('select', expect.any(Function))
  })
})
