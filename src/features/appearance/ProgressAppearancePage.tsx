import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { GoalProgressView } from '../goals/GoalProgressView'
import type { GoalProgress, RingKey } from '../nutrition/goals'
import {
  activeCustomGoalColors,
  goalColors,
  type Appearance,
  type CustomGoalColors,
  type GoalColors,
  type GoalPalette,
} from './appearance'
import { APPEARANCE_PATH, PALETTE_OPTIONS, PROGRESS_OPTIONS } from './appearanceLabels'
import { OptionCards, SettingSection } from './AppearanceOptions'
import { AppearanceSubPage } from './AppearanceSubPage'
import { OverColorsSection } from './OverColorsSection'
import { DEFAULT_OVER_COLORS } from './overColors'
import { RingColors } from './RingColors'
import { useAppearanceSettings } from './useAppearanceSettings'

// the card for the user's own ring colors; not a stored palette
const CUSTOM = 'custom' as const

function ColorDots({ colors }: { readonly colors: GoalColors }) {
  return (
    <span aria-hidden="true" className="flex gap-1">
      {colors.map((color, index) => (
        <span key={index} className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
      ))}
    </span>
  )
}

function sample(key: GoalProgress['key'], consumed: number, target: number): GoalProgress {
  const ratio = consumed / target
  return {
    key,
    consumed,
    target,
    ratio,
    remaining: target - consumed,
    reached: ratio >= 1,
    incomplete: false,
    estimated: false,
  }
}

// a typical day, so every option can be judged on the preview
const SAMPLE_PROGRESS = [
  sample('kcal', 1340, 2100),
  sample('protein', 92, 140),
  sample('carbs', 150, 230),
  sample('fat', 41, 70),
  sample('fiber', 18, 30),
]

// a day over the goals: only the calories change color, the rest keep theirs
const SAMPLE_OVER = [
  sample('kcal', 2500, 2100),
  sample('protein', 150, 140),
  sample('carbs', 280, 230),
  sample('fat', 85, 70),
  sample('fiber', 32, 30),
]

/** Settings › Appearance › Progress: how the goal rings and bars look. */
export function ProgressAppearancePage() {
  const { profile, appearance, scheme, update, change } = useAppearanceSettings()
  const accent = profile.accent_color
  const stored = appearance.customGoalColors ?? {}
  const active = activeCustomGoalColors(appearance)
  const customOn = Object.keys(active).length > 0
  const hasStored = Object.keys(stored).length > 0

  // the custom colors and their flag are always written together
  function saveColors(next: Partial<Appearance>, colors: CustomGoalColors, on: boolean) {
    const { customGoalColors: _colors, customGoalColorsOn: _on, ...others } = appearance
    const hasColors = Object.keys(colors).length > 0
    update.mutate({
      appearance: {
        ...others,
        ...next,
        ...(hasColors ? { customGoalColors: colors, customGoalColorsOn: on } : {}),
      },
    })
  }

  // a palette is another preset: the custom colors stay stored, switched off
  const choosePalette = (choice: GoalPalette | typeof CUSTOM) =>
    choice === CUSTOM
      ? saveColors({}, stored, true)
      : saveColors({ goalPalette: choice }, stored, false)

  // editing a ring starts from the stored custom colors and switches Custom on
  function changeRing(key: RingKey, color: string | null) {
    const { [key]: _previous, ...others } = stored
    saveColors({}, color === null ? others : { ...others, [key]: color }, true)
  }

  return (
    <AppearanceSubPage
      title="Progress"
      back={{ path: APPEARANCE_PATH, label: 'Appearance' }}
      saveError={update.error}
    >
      <section aria-label="Preview" className="mt-3 rounded-[28px] bg-bg-elevated p-4 shadow-card">
        <GoalProgressView progress={SAMPLE_PROGRESS} style={appearance.progressStyle} />
      </section>

      <SettingSection title="Progress style">
        <SegmentedControl
          label="Progress style"
          options={PROGRESS_OPTIONS}
          value={appearance.progressStyle}
          onChange={(style) => change('progressStyle', style)}
        />
      </SettingSection>

      <SettingSection title="Goal colors">
        <OptionCards
          label="Goal colors"
          value={customOn ? CUSTOM : appearance.goalPalette}
          onChange={choosePalette}
          options={[
            ...PALETTE_OPTIONS.map((palette) => ({
              ...palette,
              preview: <ColorDots colors={goalColors(palette.value, scheme, accent)} />,
            })),
            // your own ring colors, on the palette that is picked
            ...(hasStored
              ? [
                  {
                    value: CUSTOM,
                    label: 'Custom',
                    preview: (
                      <ColorDots
                        colors={goalColors(appearance.goalPalette, scheme, accent, stored)}
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
      </SettingSection>

      <RingColors
        colors={goalColors(appearance.goalPalette, scheme, accent, active)}
        custom={active}
        onChange={changeRing}
      />

      <OverColorsSection
        over={appearance.overColors ?? DEFAULT_OVER_COLORS}
        onChange={(over) => change('overColors', over)}
      />
      <section
        aria-label="Preview when over"
        className="mt-3 rounded-[28px] bg-bg-elevated p-4 shadow-card"
      >
        <GoalProgressView progress={SAMPLE_OVER} style={appearance.progressStyle} />
      </section>
    </AppearanceSubPage>
  )
}
