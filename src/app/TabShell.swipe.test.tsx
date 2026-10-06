import { act, fireEvent, screen } from '@testing-library/react'
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
    rootNode: vi.fn(() => document.createElement('div')),
    selectedScrollSnap: vi.fn(() => state.snap),
    scrollTo: vi.fn((index: number) => {
      state.snap = index
    }),
  }
  return { handlers, state, api }
})

vi.mock('../features/dishes/dishesApi', () => ({
  fetchLeftoverDishes: vi.fn().mockResolvedValue([]),
  fetchDish: vi.fn(),
  saveDish: vi.fn(),
  deleteDish: vi.fn(),
}))
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
vi.mock('../features/ingredients/ingredientsApi', () => ({
  fetchIngredients: vi.fn().mockResolvedValue([]),
  fetchCategories: vi.fn().mockResolvedValue([]),
  fetchCategoryGroups: vi.fn().mockResolvedValue([]),
}))
vi.mock('../features/meals/mealsApi', () => ({
  fetchDay: vi.fn().mockResolvedValue([]),
}))
vi.mock('../features/goals/goalsApi', () => ({
  fetchGoals: vi.fn().mockResolvedValue([]),
}))
vi.mock('../features/history/historyApi', () => ({
  fetchDailyTotals: vi.fn().mockResolvedValue([]),
}))
vi.mock('../features/auth/authApi', () => ({ signOut: vi.fn() }))

import { TabShell } from './TabShell'

const PROFILE = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  appearance: {},
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

const watchDrag = () => embla.state.options.watchDrag as (api: unknown, event: Event) => boolean
const activePage = () =>
  screen.getAllByTestId('tab-page').find((page) => !page.hasAttribute('inert')) as HTMLElement

function drag(from: { x: number; y: number }, to: { x: number; y: number }) {
  const page = activePage()
  fireEvent.touchStart(page, { touches: [{ clientX: from.x, clientY: from.y }] })
  fireEvent.touchEnd(page, { changedTouches: [{ clientX: to.x, clientY: to.y }] })
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

    expect(embla.state.options).toMatchObject({ startIndex: 3 })
  })

  test('a swipe that settles on another page updates the URL', () => {
    renderShell('/today')

    swipeTo(2)

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

    swipeTo(2)

    expect(screen.getByTestId('path')).toHaveTextContent('/history/2026-10-01')
  })

  test('gestures starting inside a swipe lock do not switch tabs', () => {
    renderShell('/today')
    const locked = document.createElement('div')
    locked.setAttribute('data-swipe-lock', '')
    const inner = document.createElement('span')
    locked.append(inner)

    expect(watchDrag()(embla.api, { target: inner } as unknown as Event)).toBe(false)
    expect(watchDrag()(embla.api, { target: document.body } as unknown as Event)).toBe(true)
  })

  test('when a swipe comes to rest, the carousel snaps exactly onto the current tab', () => {
    renderShell('/settings')
    embla.state.snap = 4
    embla.api.scrollTo.mockClear()

    // e.g. after an iOS rubber-band pull past the last page
    act(() => embla.handlers.get('settle')?.())

    expect(embla.api.scrollTo).toHaveBeenCalledWith(4, true)
  })

  test('returning to the app re-aligns the carousel', () => {
    renderShell('/ingredients')
    embla.state.snap = 3
    embla.api.scrollTo.mockClear()

    act(() => window.dispatchEvent(new Event('pageshow')))

    expect(embla.api.scrollTo).toHaveBeenCalledWith(3, true)
  })

  test('stops listening when unmounted', () => {
    const { unmount } = renderShell('/today')

    unmount()

    expect(embla.api.off).toHaveBeenCalledWith('select', expect.any(Function))
  })

  describe('on a settings sub-page', () => {
    test('swiping right goes back to Settings instead of switching tabs', () => {
      renderShell('/settings/appearance')

      expect(watchDrag()(embla.api, { target: document.body } as unknown as Event)).toBe(false)
      drag({ x: 30, y: 300 }, { x: 200, y: 320 })

      expect(screen.getByTestId('path')).toHaveTextContent(/^\/settings$/)
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Settings')
    })

    test('on a page inside Appearance, swiping right goes back to the Appearance menu', () => {
      renderShell('/settings/appearance/colors')

      drag({ x: 30, y: 300 }, { x: 200, y: 320 })

      expect(screen.getByTestId('path')).toHaveTextContent(/^\/settings\/appearance$/)
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Appearance')
    })

    test.each([
      ['a short drag', { x: 150, y: 300 }],
      ['a mostly vertical drag', { x: 120, y: 500 }],
      ['a drag to the left', { x: -100, y: 300 }],
    ])('%s stays on the page', (_name, to) => {
      renderShell('/settings/appearance')

      drag({ x: 100, y: 300 }, to)

      expect(screen.getByTestId('path')).toHaveTextContent('/settings/appearance')
    })

    test('back on Settings, swiping switches tabs again', () => {
      renderShell('/settings')

      expect(watchDrag()(embla.api, { target: document.body } as unknown as Event)).toBe(true)
    })
  })

  test('a selected history day is not a sub-page: swiping still switches tabs', () => {
    renderShell('/history/2026-10-01')

    expect(watchDrag()(embla.api, { target: document.body } as unknown as Event)).toBe(true)
    drag({ x: 30, y: 300 }, { x: 200, y: 300 })
    expect(screen.getByTestId('path')).toHaveTextContent('/history/2026-10-01')
  })
})
