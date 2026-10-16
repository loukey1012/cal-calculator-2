import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import type { Json } from '../../lib/database.types'
import { renderWithProviders } from '../../test/render'

vi.mock('../household/householdApi', () => ({
  fetchHousehold: vi.fn(() => new Promise(() => {})),
  fetchMembers: vi.fn(() => new Promise(() => {})),
  updateProfile: vi.fn(),
}))
vi.mock('../auth/authApi', () => ({ signOut: vi.fn() }))

import { updateProfile } from '../household/householdApi'
import { SettingsPage } from '../settings/SettingsPage'
import { DEFAULT_GLASS_FIELD } from './glassField'

const ME = {
  id: 'u1',
  household_id: 'h1',
  display_name: 'Lukas',
  accent_color: '#007aff',
  appearance: {},
  created_at: '',
  updated_at: '',
}
const MENU = '/settings/appearance'
const BACKGROUND = '/settings/appearance/background'

function renderPage(route: string, appearance: { [key: string]: Json } = {}) {
  return renderWithProviders(
    <CurrentUserContext value={{ profile: { ...ME, appearance }, householdId: 'h1' }}>
      <SettingsPage />
    </CurrentUserContext>,
    { route },
  )
}

const radio = (group: string, name: string | RegExp) =>
  within(screen.getByRole('radiogroup', { name: group })).getByRole('radio', { name })

/** The background saved by the latest change. */
async function savedField() {
  await waitFor(() => expect(updateProfile).toHaveBeenCalled())
  const [, patch] = vi.mocked(updateProfile).mock.lastCall ?? []
  const appearance = patch?.appearance as { glassField?: Record<string, unknown> } | undefined
  return appearance?.glassField
}

afterEach(() => vi.restoreAllMocks())

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(updateProfile).mockResolvedValue()
})

describe('Appearance › Background', () => {
  test('is offered in the menu only with Liquid Glass Full, summing up the choices', () => {
    const { unmount } = renderPage(MENU, { glass: 'controls' })
    expect(screen.queryByRole('button', { name: /Background/ })).not.toBeInTheDocument()
    unmount()

    renderPage(MENU, {
      glass: 'all',
      glassField: { count: 4, position: { mode: 'moving' }, colors: { preset: 'ocean' } },
    })
    expect(screen.getByRole('button', { name: /Background/ })).toHaveTextContent(
      '4 spots · Moving · Ocean',
    )
  })

  test('starts with three spots where they belong, in the style colors', () => {
    renderPage(BACKGROUND, { glass: 'all' })

    expect(screen.getByRole('heading', { level: 1, name: 'Background' })).toBeInTheDocument()
    expect(screen.getByTestId('field-preview')).toBeInTheDocument()
    expect(radio('Spots', '3')).toHaveAttribute('aria-checked', 'true')
    const spotList = screen.getByRole('list', { name: 'Spot list' })
    expect(within(spotList).getAllByRole('button')).toHaveLength(3)
    expect(radio('Position', 'Specified')).toHaveAttribute('aria-checked', 'true')
    expect(radio('Colors', 'Preset')).toHaveAttribute('aria-checked', 'true')
    expect(radio('Preset', /Style/)).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('slider', { name: 'Strength' })).toHaveValue('50')
    expect(screen.queryByRole('switch', { name: 'Slow drift' })).not.toBeInTheDocument()
  })

  test('dragging inside the preview never swipes tabs or pages', () => {
    renderPage(BACKGROUND, { glass: 'all' })

    expect(screen.getByTestId('field-preview')).toHaveAttribute('data-swipe-lock')
  })

  test('the number of spots is saved, keeping the other choices', async () => {
    const user = userEvent.setup()
    renderPage(BACKGROUND, { glass: 'all', glassField: { colors: { mode: 'random' } } })

    await user.click(radio('Spots', '6'))

    expect(await savedField()).toMatchObject({ count: 6, colors: { mode: 'random' } })
  })

  test('position random: saved, with the choice when the places change', async () => {
    const user = userEvent.setup()
    renderPage(BACKGROUND, { glass: 'all', glassField: { position: { mode: 'random' } } })

    await user.click(radio('New places', 'Once per app start'))

    expect(await savedField()).toMatchObject({
      position: { mode: 'random', randomOn: 'start' },
      colors: { mode: 'preset' },
    })
  })

  test('position random: Try another moves the preview’s spots a little from where they were', async () => {
    const user = userEvent.setup()
    renderPage(BACKGROUND, { glass: 'all', glassField: { position: { mode: 'random' } } })
    const x1 = () =>
      parseFloat(screen.getByTestId('field-preview').style.getPropertyValue('--gf-x1'))
    // spot 1 is placed at 15 %
    expect(x1()).toBe(15)

    for (let step = 0; step < 4; step += 1) {
      const before = x1()
      await user.click(screen.getByRole('button', { name: 'Try another' }))
      expect(Math.abs(x1() - before)).toBeLessThanOrEqual(15.5)
    }
    expect(x1()).not.toBe(15)
  })

  test('position moving: picked from the segmented control, at medium speed', async () => {
    const user = userEvent.setup()
    renderPage(BACKGROUND, { glass: 'all' })
    expect(screen.getAllByRole('button', { name: /Move spot/ })).toHaveLength(3)

    await user.click(radio('Position', 'Moving'))

    expect(await savedField()).toMatchObject({ position: { mode: 'moving', speed: 'medium' } })
  })

  test('position moving: the speed is saved, the preview moves, without spot handles', async () => {
    const user = userEvent.setup()
    renderPage(BACKGROUND, { glass: 'all', glassField: { position: { mode: 'moving' } } })

    await user.click(radio('Speed', 'Fast'))

    expect(await savedField()).toMatchObject({ position: { mode: 'moving', speed: 'fast' } })
    expect(screen.queryByRole('button', { name: /Move spot/ })).not.toBeInTheDocument()
    expect(screen.getByTestId('field-preview')).toHaveAttribute('data-glass-moving', 'medium')
  })

  test('position moving: says why the spots stay still when the phone asks for less motion', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('reduce'),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    )
    renderPage(BACKGROUND, { glass: 'all', glassField: { position: { mode: 'moving' } } })

    expect(
      screen.getByText('Your iPhone asks for less motion, so the spots stay still.'),
    ).toBeInTheDocument()
  })

  test('a spot in the preview moves with the arrow keys', async () => {
    renderPage(BACKGROUND, { glass: 'all' })

    fireEvent.keyDown(screen.getByRole('button', { name: /Move spot 1/ }), { key: 'ArrowRight' })

    const moved = (await savedField())?.spots as Array<{ x: number }>
    expect(moved[0]?.x).toBeCloseTo((DEFAULT_GLASS_FIELD.spots[0]?.x ?? 0) + 0.05)
  })

  test('each spot’s size can be set whatever the colors; its color only with Custom', async () => {
    const user = userEvent.setup()
    const { unmount } = renderPage(BACKGROUND, { glass: 'all' })
    await user.click(screen.getByRole('button', { name: /^Spot 1/ }))
    const sheet = screen.getByRole('dialog', { name: 'Spot 1' })
    expect(within(sheet).getByRole('slider', { name: 'Size' })).toBeInTheDocument()
    expect(within(sheet).queryByRole('radio', { name: 'Green' })).not.toBeInTheDocument()
    unmount()

    renderPage(BACKGROUND, { glass: 'all', glassField: { colors: { mode: 'custom' } } })
    await user.click(screen.getByRole('button', { name: /^Spot 1/ }))
    await user.click(
      within(screen.getByRole('dialog', { name: 'Spot 1' })).getByRole('radio', { name: 'Green' }),
    )
    const recolored = (await savedField())?.spots as Array<{ color: string }>
    expect(recolored[0]?.color).not.toBe(DEFAULT_GLASS_FIELD.spots[0]?.color)
  })

  test('colors preset: picking a palette saves it', async () => {
    const user = userEvent.setup()
    renderPage(BACKGROUND, { glass: 'all' })

    await user.click(radio('Preset', /Sunset/))

    expect(await savedField()).toMatchObject({ colors: { mode: 'preset', preset: 'sunset' } })
  })

  test('colors preset: each card’s dots share six equal columns, so they all fit', () => {
    renderPage(BACKGROUND, { glass: 'all' })

    const sunset = within(radio('Preset', /Sunset/)).getByTestId('preset-dots')
    const style = within(radio('Preset', /Style/)).getByTestId('preset-dots')

    expect(sunset).toHaveClass('grid', 'grid-cols-6')
    expect(sunset.children).toHaveLength(6)
    expect(style).toHaveClass('grid', 'grid-cols-6')
    expect(style.children).toHaveLength(3)
  })

  test('colors cycle: colors can be added, with the choice when they change', async () => {
    const user = userEvent.setup()
    renderPage(BACKGROUND, { glass: 'all', glassField: { colors: { mode: 'cycle' } } })

    await user.click(screen.getByRole('button', { name: 'Add color' }))
    const colors = (await savedField())?.colors as { palette: unknown[] }
    expect(colors.palette).toHaveLength(DEFAULT_GLASS_FIELD.colors.palette.length + 1)

    await user.click(radio('New colors', 'Once per app start'))
    expect(await savedField()).toMatchObject({ colors: { mode: 'cycle', changeOn: 'start' } })
  })

  test('colors random: saved from the segmented control', async () => {
    const user = userEvent.setup()
    renderPage(BACKGROUND, { glass: 'all' })

    await user.click(radio('Colors', 'Random'))

    expect(await savedField()).toMatchObject({ colors: { mode: 'random' } })
  })

  test('random places or colors can be tried out in the preview', () => {
    const { unmount } = renderPage(BACKGROUND, { glass: 'all' })
    expect(screen.queryByRole('button', { name: 'Try another' })).not.toBeInTheDocument()
    unmount()

    renderPage(BACKGROUND, { glass: 'all', glassField: { colors: { mode: 'random' } } })
    expect(screen.getByRole('button', { name: 'Try another' })).toBeInTheDocument()
  })

  test('strength is saved when the slider is let go', async () => {
    renderPage(BACKGROUND, { glass: 'all' })

    const strength = screen.getByRole('slider', { name: 'Strength' })
    fireEvent.change(strength, { target: { value: '70' } })
    fireEvent.pointerUp(strength)

    expect(await savedField()).toMatchObject({ strength: 0.7 })
  })
})
