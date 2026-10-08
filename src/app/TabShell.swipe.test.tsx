import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
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
vi.mock('../features/weight/weightApi', () => ({
  fetchWeights: vi.fn().mockResolvedValue([]),
  saveWeight: vi.fn(),
  deleteWeight: vi.fn(),
}))
vi.mock('../features/history/historyApi', () => ({
  fetchDailyTotals: vi.fn().mockResolvedValue([]),
}))
vi.mock('../features/auth/authApi', () => ({ signOut: vi.fn() }))
vi.mock('../features/live/liveChannel', () => ({ openLiveChannel: () => ({ close: () => {} }) }))

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

type Point = { x: number; y: number }

// a steady drag: one move every 50 ms (the clock is the one the swipe measures speed with)
let stepMs = 50
let clock = 0

/** Starts a drag and moves the finger in steps; returns whether a move was taken over. */
function dragTo(from: Point, to: Point): boolean {
  vi.spyOn(performance, 'now').mockImplementation(() => clock)
  const page = activePage()
  fireEvent.touchStart(page, { touches: [{ clientX: from.x, clientY: from.y }] })
  let notPrevented = true
  for (const step of [0.25, 0.5, 0.75, 1]) {
    clock += stepMs
    const point = {
      clientX: from.x + (to.x - from.x) * step,
      clientY: from.y + (to.y - from.y) * step,
    }
    notPrevented = fireEvent.touchMove(page, { touches: [point] }) && notPrevented
  }
  return !notPrevented
}

function release(to: Point) {
  fireEvent.touchEnd(activePage(), { changedTouches: [{ clientX: to.x, clientY: to.y }] })
}

function drag(from: Point, to: Point) {
  dragTo(from, to)
  release(to)
}

// the visible tab's page stack (Cook and Settings each have one)
const layers = () => within(activePage()).getAllByTestId('stack-layer')

function reduceMotion(reduce: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: reduce && query.includes('reduce'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
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

  describe('on a Cook step', () => {
    beforeEach(() => vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390))
    afterEach(() => vi.restoreAllMocks())

    test('swiping right on the amount goes back to the search, not to another tab', async () => {
      renderShell('/cook/add/patty')

      expect(watchDrag()(embla.api, { target: document.body } as unknown as Event)).toBe(false)
      drag({ x: 30, y: 300 }, { x: 200, y: 320 })

      await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(/^\/cook\/add$/))
      expect(within(activePage()).getByLabelText('Search ingredients')).toBeInTheDocument()
    })

    test('swiping right on the search goes back to the dish', async () => {
      renderShell('/cook/add')

      drag({ x: 30, y: 300 }, { x: 200, y: 320 })

      await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(/^\/cook$/))
      expect(
        within(activePage()).getByRole('button', { name: 'Add ingredient' }),
      ).toBeInTheDocument()
    })

    test('Back slides the step away to the one before it', async () => {
      const user = userEvent.setup()
      renderShell('/cook/add')

      await user.click(within(activePage()).getByRole('button', { name: 'Back' }))

      expect(layers()).toHaveLength(2)
      await waitFor(() => expect(layers()).toHaveLength(1))
      expect(screen.getByTestId('path')).toHaveTextContent(/^\/cook$/)
    })

    test('on the dish itself, swiping switches tabs again', () => {
      renderShell('/cook')

      expect(watchDrag()(embla.api, { target: document.body } as unknown as Event)).toBe(true)
    })
  })

  describe('on a settings sub-page', () => {
    // an iPhone-wide screen (jsdom has no layout)
    beforeEach(() => vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390))
    afterEach(() => vi.restoreAllMocks())

    test('swiping right goes back to Settings instead of switching tabs', async () => {
      renderShell('/settings/appearance')

      expect(watchDrag()(embla.api, { target: document.body } as unknown as Event)).toBe(false)
      drag({ x: 30, y: 300 }, { x: 200, y: 320 })

      await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(/^\/settings$/))
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Settings')
      expect(layers()).toHaveLength(1)
    })

    test('while dragging, the page below is already there, not usable, and the page follows', () => {
      renderShell('/settings/appearance/colors')

      const takenOver = dragTo({ x: 30, y: 300 }, { x: 130, y: 310 })

      // sideways drags are ours, so the page doesn't scroll meanwhile
      expect(takenOver).toBe(true)
      const [below, top] = layers()
      expect(below).toHaveAttribute('inert')
      expect(within(below as HTMLElement).getByText('Appearance', { selector: 'h1' })).toBeTruthy()
      expect(top?.style.transform).toBe('translate3d(100px, 0, 0)')
      expect(screen.getByTestId('path')).toHaveTextContent('/settings/appearance/colors')
    })

    test('on a page inside Appearance, swiping right goes back to the Appearance menu', async () => {
      renderShell('/settings/appearance/colors')

      drag({ x: 30, y: 300 }, { x: 200, y: 320 })

      await waitFor(() =>
        expect(screen.getByTestId('path')).toHaveTextContent(/^\/settings\/appearance$/),
      )
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Appearance')
    })

    test.each([
      ['a short drag', { x: 150, y: 300 }],
      ['a mostly vertical drag', { x: 120, y: 500 }],
      ['a drag to the left', { x: -100, y: 300 }],
    ])('%s stays on the page', async (_name, to) => {
      renderShell('/settings/appearance')

      drag({ x: 100, y: 300 }, to)

      await waitFor(() => expect(layers()).toHaveLength(1))
      expect(screen.getByTestId('path')).toHaveTextContent('/settings/appearance')
    })

    test('a short but quick flick goes back too', async () => {
      stepMs = 10
      renderShell('/settings/appearance')

      drag({ x: 100, y: 300 }, { x: 160, y: 300 })
      stepMs = 50

      await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(/^\/settings$/))
    })

    test('a vertical drag is left to scrolling', () => {
      renderShell('/settings/appearance')

      expect(dragTo({ x: 100, y: 300 }, { x: 110, y: 500 })).toBe(false)
      expect(layers()).toHaveLength(1)
    })

    test('the Back button slides the page away too', async () => {
      const user = userEvent.setup()
      renderShell('/settings/appearance')

      await user.click(within(activePage()).getByRole('button', { name: 'Settings' }))

      expect(layers()).toHaveLength(2)
      // the page sliding away can't be used any more
      expect(layers()[1]).toHaveAttribute('inert')
      await waitFor(() => expect(layers()).toHaveLength(1))
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Settings')
    })

    test('opening a page slides it in over the one it was opened from', async () => {
      const user = userEvent.setup()
      renderShell('/settings')

      await user.click(screen.getByRole('button', { name: /Appearance/ }))

      const [below, top] = layers()
      expect(below).toHaveAttribute('inert')
      expect(within(top as HTMLElement).getByRole('heading', { level: 1 })).toHaveTextContent(
        'Appearance',
      )
      // usable right away, while it is still sliding in
      expect(top).not.toHaveAttribute('inert')
      await waitFor(() => expect(layers()).toHaveLength(1))
    })

    test('with Reduce Motion, pages switch at once', async () => {
      reduceMotion(true)
      const user = userEvent.setup()
      renderShell('/settings/appearance')

      await user.click(within(activePage()).getByRole('button', { name: 'Settings' }))

      expect(layers()).toHaveLength(1)
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Settings')
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
