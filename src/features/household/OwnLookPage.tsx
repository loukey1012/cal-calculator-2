import { Button } from '../../components/ios/Button'
import { SettingSection } from '../appearance/AppearanceOptions'
import { AppearanceSubPage } from '../appearance/AppearanceSubPage'
import { ColorPicker } from '../appearance/ColorPicker'
import { useAppearanceSettings } from '../appearance/useAppearanceSettings'
import { LookPreview } from './LookPreview'
import { displayName, lookFor, type OwnLook } from './partnerLook'
import { SymbolPicker } from './SymbolPicker'

export const OWN_LOOK_PATH = '/settings/me'
const BACK = { path: '/settings', label: 'Settings' } as const

/** The symbol and color you show yourself with, instead of your initial; only you see them. */
export function OwnLookPage() {
  const { profile, appearance, update } = useAppearanceSettings()
  const stored: OwnLook = appearance.ownLook ?? {}
  const look = lookFor(profile, profile.id, undefined, stored)

  function save(next: OwnLook | null) {
    const { ownLook: _previous, ...others } = appearance
    update.mutate({ appearance: next === null ? others : { ...others, ownLook: next } })
  }

  return (
    <AppearanceSubPage title="Your symbol" back={BACK} saveError={update.error}>
      <LookPreview look={look} testId="own-look-preview" />
      <p className="px-4 pt-3 text-[13px] text-label-secondary">
        Shown next to your name instead of your initial. Only you see it; your partner sees what
        they picked for you.
      </p>
      <SettingSection title="Symbol">
        <SymbolPicker
          value={stored.symbol ?? null}
          color={look.badge.color}
          initialOf={displayName(profile)}
          onChange={(symbol) => {
            const { symbol: _previous, ...others } = stored
            save(symbol === null ? others : { ...others, symbol })
          }}
        />
      </SettingSection>
      <SettingSection title="Color">
        <ColorPicker
          label="Color"
          value={look.badge.color}
          onChange={(color) => save({ ...stored, color })}
        />
      </SettingSection>
      <div className="mt-8">
        <Button
          variant="plain"
          disabled={Object.keys(stored).length === 0}
          onClick={() => save(null)}
        >
          Reset to your initial
        </Button>
      </div>
    </AppearanceSubPage>
  )
}
