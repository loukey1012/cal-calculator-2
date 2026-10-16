import { useState } from 'react'
import { Button } from '../../components/ios/Button'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { Slider } from '../../components/ios/Slider'
import {
  APPEARANCE_PATH,
  COLOR_MODE_OPTIONS,
  FIELD_CHANGE_OPTIONS,
  POSITION_OPTIONS,
  SPEED_OPTIONS,
  SPOT_COUNT_OPTIONS,
} from './appearanceLabels'
import { SettingSection } from './AppearanceOptions'
import { AppearanceSubPage } from './AppearanceSubPage'
import { PaletteList, PresetCards, SpotList } from './FieldEditors'
import { FieldPreview } from './FieldPreview'
import {
  DEFAULT_GLASS_FIELD,
  MAX_STRENGTH,
  MIN_STRENGTH,
  PAINTED_RING,
  fieldSpots,
  type ColorMode,
  type FieldColors,
  type FieldPosition,
  type GlassField,
  type PositionMode,
  type Spot,
} from './glassField'
import { useAppearanceSettings } from './useAppearanceSettings'

const POSITION_FOOTERS: Record<PositionMode, string> = {
  specified: 'Each spot where you drag it in the preview.',
  random: 'New places, chosen at random.',
  moving: 'The spots wander on their own.',
}
const REDUCED_MOTION_FOOTER = 'Your iPhone asks for less motion, so the spots stay still.'

const COLOR_FOOTERS: Record<ColorMode, string> = {
  custom: 'Pick each spot’s color under Spots.',
  preset: 'A ready-made palette; Style uses the ring colors of your style.',
  cycle: 'Moves through your colors, a few at a time.',
  random: 'New colors, chosen at random.',
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Spacing for a second control under a section's segmented control. */
function Below({ children }: { readonly children: React.ReactNode }) {
  return <div className="mt-3">{children}</div>
}

/** Settings › Appearance › Background: the spots behind Liquid Glass Full. */
export function BackgroundAppearancePage() {
  const { appearance, update, change } = useAppearanceSettings()
  const field = appearance.glassField ?? DEFAULT_GLASS_FIELD
  const { position, colors } = field
  // "Try another" in the preview of random places and cycle or random colors
  const [previewSeed, setPreviewSeed] = useState(0)
  const save = (patch: Partial<GlassField>) => change('glassField', { ...field, ...patch })
  const savePosition = (patch: Partial<FieldPosition>) =>
    save({ position: { ...position, ...patch } })
  const saveColors = (patch: Partial<FieldColors>) => save({ colors: { ...colors, ...patch } })
  const saveSpot = (index: number, patch: Partial<Spot>) =>
    save({
      spots: field.spots.map((current, at) => (at === index ? { ...current, ...patch } : current)),
    })

  const spots = fieldSpots(field, {
    ring: PAINTED_RING,
    positionSeed: previewSeed,
    colorSeed: previewSeed,
  })
  const changes = position.mode === 'random' || colors.mode === 'cycle' || colors.mode === 'random'
  const positionFooter =
    position.mode === 'moving' && prefersReducedMotion()
      ? REDUCED_MOTION_FOOTER
      : POSITION_FOOTERS[position.mode]

  return (
    <AppearanceSubPage
      title="Background"
      back={{ path: APPEARANCE_PATH, label: 'Appearance' }}
      saveError={update.error}
    >
      <p className="text-[14px] font-medium text-label-secondary">
        The colors behind Liquid Glass Full.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <FieldPreview
          spots={spots}
          strength={field.strength}
          moving={position.mode === 'moving' ? position.speed : undefined}
          onMove={
            position.mode === 'specified' ? (index, x, y) => saveSpot(index, { x, y }) : undefined
          }
        />
        {changes && (
          <Button variant="plain" onClick={() => setPreviewSeed((seed) => seed + 1)}>
            Try another
          </Button>
        )}
      </div>

      <SettingSection title="Spots">
        <SegmentedControl
          label="Spots"
          options={SPOT_COUNT_OPTIONS}
          value={String(field.count)}
          onChange={(count) => save({ count: Number(count) })}
        />
        <SpotList
          spots={field.spots.slice(0, field.count)}
          shownColors={spots.map(({ color }) => color)}
          customColors={colors.mode === 'custom'}
          onChange={saveSpot}
        />
      </SettingSection>

      <SettingSection title="Position" footer={positionFooter}>
        <SegmentedControl
          label="Position"
          options={POSITION_OPTIONS}
          value={position.mode}
          onChange={(mode) => savePosition({ mode })}
        />
        {position.mode === 'random' && (
          <Below>
            <SegmentedControl
              label="New places"
              options={FIELD_CHANGE_OPTIONS}
              value={position.randomOn}
              onChange={(randomOn) => savePosition({ randomOn })}
            />
          </Below>
        )}
        {position.mode === 'moving' && (
          <Below>
            <SegmentedControl
              label="Speed"
              options={SPEED_OPTIONS}
              value={position.speed}
              onChange={(speed) => savePosition({ speed })}
            />
          </Below>
        )}
      </SettingSection>

      <SettingSection title="Colors" footer={COLOR_FOOTERS[colors.mode]}>
        <SegmentedControl
          label="Colors"
          options={COLOR_MODE_OPTIONS}
          value={colors.mode}
          onChange={(mode) => saveColors({ mode })}
        />
        {colors.mode === 'preset' && (
          <Below>
            <PresetCards value={colors.preset} onChange={(preset) => saveColors({ preset })} />
          </Below>
        )}
        {colors.mode === 'cycle' && (
          <PaletteList palette={colors.palette} onChange={(palette) => saveColors({ palette })} />
        )}
        {(colors.mode === 'cycle' || colors.mode === 'random') && (
          <Below>
            <SegmentedControl
              label="New colors"
              options={FIELD_CHANGE_OPTIONS}
              value={colors.changeOn}
              onChange={(changeOn) => saveColors({ changeOn })}
            />
          </Below>
        )}
      </SettingSection>

      <GroupedSection>
        <Slider
          label="Strength"
          min={MIN_STRENGTH * 100}
          max={MAX_STRENGTH * 100}
          step={5}
          value={Math.round(field.strength * 100)}
          format={(value) => `${value}%`}
          onChange={(value) => save({ strength: value / 100 })}
        />
      </GroupedSection>
    </AppearanceSubPage>
  )
}
