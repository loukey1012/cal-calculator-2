import { useState } from 'react'
import { ToggleRow } from '../../components/ios/FormRows'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { Slider } from '../../components/ios/Slider'
import { Button } from '../../components/ios/Button'
import { useTodayProgress } from '../today/todayProgress'
import { APPEARANCE_PATH, FIELD_CHANGE_OPTIONS, FIELD_MODE_OPTIONS } from './appearanceLabels'
import { SettingSection } from './AppearanceOptions'
import { AppearanceSubPage } from './AppearanceSubPage'
import { PaletteList, SpotList } from './FieldEditors'
import { FieldPreview } from './FieldPreview'
import {
  DEFAULT_GLASS_FIELD,
  fieldSpots,
  MAX_STRENGTH,
  MIN_STRENGTH,
  type GlassField,
} from './glassField'
import { useAppearanceSettings } from './useAppearanceSettings'

// the preview shows the ring colors the app paints
const RING_VARIABLES = {
  kcal: 'var(--goal-kcal)',
  fat: 'var(--goal-fat)',
  fiber: 'var(--goal-fiber)',
} as const

const MODE_FOOTERS: Record<GlassField['mode'], string> = {
  style: 'The ring colors of your style.',
  custom: 'Your own spots: their colors, where they sit and how big they are.',
  random: 'New colors and places, chosen at random.',
  cycle: 'Moves through your colors, a few at a time.',
  goal: 'Calm early in the day, warmer as you near your calorie goal, a red tint once over it. Without a goal: your style’s colors.',
}

/** Settings › Appearance › Background: the colors behind Liquid Glass Full. */
export function BackgroundAppearancePage() {
  const { appearance, update, change } = useAppearanceSettings()
  const field = appearance.glassField ?? DEFAULT_GLASS_FIELD
  const progress = useTodayProgress()
  // "Try another" in the preview of random and cycle
  const [previewSeed, setPreviewSeed] = useState(0)
  const save = (patch: Partial<GlassField>) => change('glassField', { ...field, ...patch })
  const spots = fieldSpots(field, { ring: RING_VARIABLES, seed: previewSeed, progress })
  const changes = field.mode === 'random' || field.mode === 'cycle'

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
          onMove={
            field.mode === 'custom'
              ? (index, x, y) =>
                  save({
                    spots: field.spots.map((spot, at) => (at === index ? { ...spot, x, y } : spot)),
                  })
              : undefined
          }
        />
        {changes && (
          <Button variant="plain" onClick={() => setPreviewSeed((seed) => seed + 1)}>
            Try another
          </Button>
        )}
      </div>

      <SettingSection title="Colors" footer={MODE_FOOTERS[field.mode]}>
        <SegmentedControl
          label="Colors"
          options={FIELD_MODE_OPTIONS}
          value={field.mode}
          onChange={(mode) => save({ mode })}
        />
      </SettingSection>

      {field.mode === 'custom' && (
        <SpotList spots={field.spots} onChange={(next) => save({ spots: next })} />
      )}
      {field.mode === 'cycle' && (
        <PaletteList palette={field.palette} onChange={(next) => save({ palette: next })} />
      )}
      {changes && (
        <SettingSection title="Changes">
          <SegmentedControl
            label="Changes"
            options={FIELD_CHANGE_OPTIONS}
            value={field.changeOn}
            onChange={(changeOn) => save({ changeOn })}
          />
        </SettingSection>
      )}

      <GroupedSection footer="Slow drift stops when the phone asks for less motion.">
        <Slider
          label="Strength"
          min={MIN_STRENGTH * 100}
          max={MAX_STRENGTH * 100}
          step={5}
          value={Math.round(field.strength * 100)}
          format={(value) => `${value}%`}
          onChange={(value) => save({ strength: value / 100 })}
        />
        <ToggleRow label="Slow drift" checked={field.drift} onChange={(drift) => save({ drift })} />
      </GroupedSection>
    </AppearanceSubPage>
  )
}
