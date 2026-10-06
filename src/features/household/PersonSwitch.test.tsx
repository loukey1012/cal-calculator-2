import { screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { CurrentUserContext } from '../../app/currentUser'
import { renderWithProviders } from '../../test/render'
import type { Profile } from './householdApi'
import { PersonSwitch } from './PersonSwitch'

function profile(id: string, name: string, appearance: Profile['appearance'] = {}): Profile {
  return {
    id,
    household_id: 'h1',
    display_name: name,
    accent_color: '#007aff',
    appearance,
    created_at: '',
    updated_at: '',
  }
}

const HER = profile('u2', 'Lisa')

function renderSwitch(me: Profile) {
  renderWithProviders(
    <CurrentUserContext value={{ profile: me, householdId: 'h1' }}>
      <PersonSwitch people={[me, HER]} selectedId={me.id} onChange={() => {}} />
    </CurrentUserContext>,
  )
  return screen.getByRole('radiogroup', { name: 'Person' })
}

describe('PersonSwitch', () => {
  test('shows your partner as "baby" with a heart until you change it', () => {
    const group = renderSwitch(profile('u1', 'Lukas'))

    const partner = within(group).getByRole('radio', { name: 'baby' })
    expect(within(partner).getByTestId('partner-badge').querySelector('svg')).not.toBeNull()
    expect(within(group).getByRole('radio', { name: 'Lukas' })).toHaveTextContent('L')
  })

  test('shows the nickname and emoji you picked', () => {
    const me = profile('u1', 'Lukas', {
      partnerLooks: { u2: { nickname: 'Schatz', symbol: '🐰', color: '#a78bfa' } },
    })
    const group = renderSwitch(me)

    const partner = within(group).getByRole('radio', { name: 'Schatz' })
    const badge = within(partner).getByTestId('partner-badge')
    expect(badge).toHaveTextContent('🐰')
    expect(badge).toHaveStyle({ backgroundColor: '#a78bfa33' })
    expect(within(group).queryByText('Lisa')).not.toBeInTheDocument()
  })
})
