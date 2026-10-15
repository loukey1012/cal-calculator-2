import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import type { Json } from '../../lib/database.types'
import { renderWithProviders } from '../../test/render'

vi.mock('../household/householdApi', () => ({
  fetchHousehold: vi.fn(() => new Promise(() => {})),
  fetchMembers: vi.fn(() => new Promise(() => {})),
  updateProfile: vi.fn(),
}))
vi.mock('../auth/authApi', () => ({ signOut: vi.fn() }))
vi.mock('../goals/goalsApi', () => ({ fetchGoals: vi.fn(() => new Promise(() => {})) }))
vi.mock('../meals/mealsApi', () => ({ fetchDay: vi.fn(() => new Promise(() => {})) }))

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

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(updateProfile).mockResolvedValue()
})

describe('Appearance › Background', () => {
  test('is offered in the menu only with Liquid Glass Full', () => {
    const { unmount } = renderPage(MENU, { glass: 'controls' })
    expect(screen.queryByRole('button', { name: /Background/ })).not.toBeInTheDocument()
    unmount()

    renderPage(MENU, { glass: 'all' })
    expect(screen.getByRole('button', { name: /Background/ })).toHaveTextContent('Style colors')
  })

  test('starts with the style colors, a preview and the strength', () => {
    renderPage(BACKGROUND, { glass: 'all' })

    expect(screen.getByRole('heading', { level: 1, name: 'Background' })).toBeInTheDocument()
    expect(radio('Colors', 'Style')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('field-preview')).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Strength' })).toHaveValue('50')
  })

  test('random: saved, with the choice when it changes', async () => {
    const user = userEvent.setup()
    renderPage(BACKGROUND, { glass: 'all', glassField: { mode: 'random' } })

    await user.click(radio('Changes', 'Once per app start'))

    expect(await savedField()).toMatchObject({ mode: 'random', changeOn: 'start' })
  })

  test('picking a mode saves it, keeping the other choices', async () => {
    const user = userEvent.setup()
    renderPage(BACKGROUND, { glass: 'all', glassField: { drift: true } })

    await user.click(radio('Colors', 'Cycle'))

    expect(await savedField()).toMatchObject({ mode: 'cycle', drift: true })
  })

  test('custom: a spot can be added, recolored and removed, never fewer than two', async () => {
    const user = userEvent.setup()
    renderPage(BACKGROUND, { glass: 'all', glassField: { mode: 'custom' } })
    const spots = screen.getByRole('list', { name: 'Spots' })
    expect(within(spots).getAllByRole('button', { name: /^Spot \d/ })).toHaveLength(3)

    await user.click(screen.getByRole('button', { name: 'Add spot' }))
    expect(((await savedField())?.spots as unknown[] | undefined)?.length).toBe(4)

    await user.click(within(spots).getByRole('button', { name: /^Spot 1/ }))
    const sheet = screen.getByRole('dialog', { name: 'Spot 1' })
    await user.click(within(sheet).getByRole('radio', { name: 'Green' }))
    const recolored = (await savedField())?.spots as Array<{ color: string }>
    expect(recolored[0]?.color).not.toBe(DEFAULT_GLASS_FIELD.spots[0]?.color)
  })

  test('custom: the last two spots can’t be removed', async () => {
    const user = userEvent.setup()
    const two = DEFAULT_GLASS_FIELD.spots.slice(0, 2)
    renderPage(BACKGROUND, { glass: 'all', glassField: { mode: 'custom', spots: two } })

    await user.click(screen.getByRole('button', { name: /^Spot 1/ }))

    expect(screen.queryByRole('button', { name: 'Remove spot' })).not.toBeInTheDocument()
  })

  test('custom: a spot in the preview moves with the arrow keys', async () => {
    renderPage(BACKGROUND, { glass: 'all', glassField: { mode: 'custom' } })

    const handle = screen.getByRole('button', { name: /Move spot 1/ })
    fireEvent.keyDown(handle, { key: 'ArrowRight' })

    const moved = (await savedField())?.spots as Array<{ x: number }>
    expect(moved[0]?.x).toBeCloseTo((DEFAULT_GLASS_FIELD.spots[0]?.x ?? 0) + 0.05)
  })

  test('cycle: colors can be added to the palette', async () => {
    const user = userEvent.setup()
    renderPage(BACKGROUND, { glass: 'all', glassField: { mode: 'cycle' } })

    await user.click(screen.getByRole('button', { name: 'Add color' }))

    expect(((await savedField())?.palette as unknown[] | undefined)?.length).toBe(
      DEFAULT_GLASS_FIELD.palette.length + 1,
    )
  })

  test('strength is saved when the slider is let go, drift with its switch', async () => {
    const user = userEvent.setup()
    renderPage(BACKGROUND, { glass: 'all' })

    const strength = screen.getByRole('slider', { name: 'Strength' })
    fireEvent.change(strength, { target: { value: '70' } })
    fireEvent.pointerUp(strength)
    expect(await savedField()).toMatchObject({ strength: 0.7 })

    await user.click(screen.getByRole('switch', { name: 'Slow drift' }))
    expect(await savedField()).toMatchObject({ drift: true })
  })
})
