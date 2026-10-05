import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { GoalProgressView } from '../goals/GoalProgressView'
import type { GoalProgress } from '../nutrition/goals'
import { goalColors } from './appearance'
import { APPEARANCE_PATH, PALETTE_OPTIONS, PROGRESS_OPTIONS } from './appearanceLabels'
import { OptionCards, SettingSection } from './AppearanceOptions'
import { AppearanceSubPage } from './AppearanceSubPage'
import { useAppearanceSettings } from './useAppearanceSettings'

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
  }
}

// a typical day, so every option can be judged on the preview
const SAMPLE_PROGRESS = [
  sample('kcal', 1340, 2100),
  sample('protein', 92, 140),
  sample('carbs', 150, 230),
  sample('fat', 41, 70),
]

/** Settings › Appearance › Progress: how the goal rings and bars look. */
export function ProgressAppearancePage() {
  const { profile, appearance, scheme, update, change } = useAppearanceSettings()

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
          value={appearance.goalPalette}
          onChange={(palette) => change('goalPalette', palette)}
          options={PALETTE_OPTIONS.map((palette) => ({
            ...palette,
            preview: (
              <span aria-hidden="true" className="flex gap-1">
                {goalColors(palette.value, scheme, profile.accent_color).map((color, index) => (
                  <span
                    key={index}
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
            ),
          }))}
        />
      </SettingSection>
    </AppearanceSubPage>
  )
}
