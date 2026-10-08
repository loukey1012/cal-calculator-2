import { useState, type KeyboardEvent } from 'react'
import { useCurrentUser } from '../../app/currentUser'
import { Button } from '../../components/ios/Button'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { TextField } from '../../components/ios/TextField'
import { SettingSection } from '../appearance/AppearanceOptions'
import { ColorPicker } from '../appearance/ColorPicker'
import { AppearanceSubPage } from '../appearance/AppearanceSubPage'
import { useAppearanceSettings } from '../appearance/useAppearanceSettings'
import { useMembers } from './hooks'
import type { Profile } from './householdApi'
import {
  DEFAULT_PARTNER_LOOK,
  displayName,
  lookFor,
  MAX_NICKNAME_LENGTH,
  withPartnerLook,
  type PartnerLook,
  type PartnerLooks,
} from './partnerLook'
import { LookPreview } from './LookPreview'
import { SymbolPicker } from './SymbolPicker'

export const PARTNER_PATH = '/settings/partner'
const BACK = { path: '/settings', label: 'Settings' } as const

/** The nickname, symbol and color you give your partner; only you see them. */
export function PartnerPage() {
  const { householdId } = useCurrentUser()
  const members = useMembers(householdId)
  const { profile, appearance, update, change } = useAppearanceSettings()
  const partner = members.data?.find((member) => member.id !== profile.id)
  const memberIds = members.data?.map(({ id }) => id) ?? []

  return (
    <AppearanceSubPage title="Partner" back={BACK} saveError={update.error}>
      {members.data && !partner && (
        <p className="mt-6 px-1 text-[15px] text-label-secondary">
          No partner yet. Share your invite code in Settings, then give them a nickname here.
        </p>
      )}
      {partner && (
        <PartnerLookEditor
          partner={partner}
          viewerId={profile.id}
          looks={appearance.partnerLooks}
          onSave={(look) =>
            change(
              'partnerLooks',
              withPartnerLook(appearance.partnerLooks, partner.id, look, memberIds),
            )
          }
        />
      )}
    </AppearanceSubPage>
  )
}

type PartnerLookEditorProps = {
  readonly partner: Profile
  readonly viewerId: string
  readonly looks: PartnerLooks | undefined
  /** the partner's whole new look, or null to go back to the defaults */
  readonly onSave: (look: PartnerLook | null) => void
}

function PartnerLookEditor({ partner, viewerId, looks, onSave: save }: PartnerLookEditorProps) {
  const stored = looks?.[partner.id] ?? {}
  const look = lookFor(partner, viewerId, looks)
  const symbol = look.badge.kind === 'symbol' ? look.badge.symbol : DEFAULT_PARTNER_LOOK.symbol

  function saveNickname(nickname: string) {
    const { nickname: _previous, ...others } = stored
    save(nickname === '' ? others : { ...others, nickname })
  }

  return (
    <>
      <LookPreview look={look} testId="partner-preview" />
      {/* remounted when the saved nickname changes, e.g. after a reset */}
      <NicknameField key={look.name} saved={look.name} onSave={saveNickname} />
      <p className="px-4 pt-2 text-[13px] text-label-secondary">
        Account name: {displayName(partner)}. Only you see the nickname.
      </p>
      <SettingSection title="Symbol">
        <SymbolPicker
          value={symbol}
          color={look.badge.color}
          // no initial is offered here, so there is always a symbol
          onChange={(value) => value && save({ ...stored, symbol: value })}
        />
      </SettingSection>
      <SettingSection title="Color">
        <ColorPicker
          label="Color"
          value={look.badge.color}
          onChange={(value) => save({ ...stored, color: value })}
        />
      </SettingSection>
      <div className="mt-8">
        <Button
          variant="plain"
          disabled={Object.keys(stored).length === 0}
          onClick={() => save(null)}
        >
          Reset to “{DEFAULT_PARTNER_LOOK.nickname}” and the heart
        </Button>
      </div>
    </>
  )
}

type NicknameFieldProps = { readonly saved: string; readonly onSave: (nickname: string) => void }

/** Saved when you leave the field or press Enter; an empty one goes back to the default. */
function NicknameField({ saved, onSave }: NicknameFieldProps) {
  const [draft, setDraft] = useState(saved)

  function commit() {
    const nickname = draft.trim()
    if (nickname === saved) return
    if (nickname === '') setDraft(DEFAULT_PARTNER_LOOK.nickname)
    onSave(nickname)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') event.currentTarget.blur()
  }

  return (
    <GroupedSection header="Nickname">
      <TextField
        label="Nickname"
        value={draft}
        maxLength={MAX_NICKNAME_LENGTH}
        autoComplete="off"
        enterKeyHint="done"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    </GroupedSection>
  )
}
