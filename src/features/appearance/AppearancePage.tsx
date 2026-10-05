import { useNavigate } from 'react-router'
import { useCurrentUser } from '../../app/currentUser'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { ChevronLeftIcon } from '../../components/ios/icons'
import { PageHeader } from '../../components/ios/PageHeader'
import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { toUserMessage } from '../../lib/errors'
import { GoalProgressView } from '../goals/GoalProgressView'
import { useUpdateProfile } from '../household/hooks'
import type { GoalProgress } from '../nutrition/goals'
import {
  ACCENT_COLORS,
  goalColors,
  parseAppearance,
  resolveScheme,
  SCHEME_SURFACES,
  type Appearance,
  type DarkStyle,
  type GoalPalette,
} from './appearance'
import { OptionCards, SettingSection, SwatchPicker } from './AppearanceOptions'
import { usePrefersDark } from './useAppearance'

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const

const PROGRESS_OPTIONS = [
  { value: 'rings', label: 'Rings' },
  { value: 'ringBars', label: 'Ring + bars' },
  { value: 'bars', label: 'Bars' },
  { value: 'compact', label: 'Compact' },
] as const

const CATEGORY_LAYOUT_OPTIONS = [
  { value: 'line', label: 'One line' },
  { value: 'wrap', label: 'All on screen' },
] as const

const DARK_STYLES: ReadonlyArray<{
  value: DarkStyle
  label: string
  description: string
  fontFamily: string
}> = [
  {
    value: 'soft',
    label: 'Soft',
    description: 'Deep grey, rounded',
    fontFamily: "'Manrope Variable', sans-serif",
  },
  {
    value: 'bento',
    label: 'Bento',
    description: 'Near-black, bold numbers',
    fontFamily: "'Space Grotesk Variable', sans-serif",
  },
]

const PALETTES: ReadonlyArray<{ value: GoalPalette; label: string }> = [
  { value: 'vivid', label: 'Vivid' },
  { value: 'pastel', label: 'Pastel' },
  { value: 'accent', label: 'Accent shades' },
  { value: 'contrast', label: 'High contrast' },
]

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

function DarkStylePreview({ style }: { readonly style: (typeof DARK_STYLES)[number] }) {
  const { bg, card } = SCHEME_SURFACES[style.value]
  return (
    <span
      aria-hidden="true"
      className="flex h-16 flex-col gap-1.5 rounded-xl p-2"
      style={{ backgroundColor: bg }}
    >
      <span
        className="flex flex-1 items-center gap-2 rounded-lg px-2"
        style={{ backgroundColor: card }}
      >
        <span className="h-4 w-4 rounded-full border-[3px] border-accent" />
        <span className="text-[13px] font-bold text-white" style={{ fontFamily: style.fontFamily }}>
          1,340
        </span>
      </span>
      <span className="h-1.5 w-3/5 rounded-full bg-accent" />
    </span>
  )
}

/** Settings › Appearance: how the app looks for you, saved to your account. */
export function AppearancePage() {
  const { profile } = useCurrentUser()
  const navigate = useNavigate()
  const update = useUpdateProfile(profile.id)
  const prefersDark = usePrefersDark()
  const appearance = parseAppearance(profile.appearance)
  const scheme = resolveScheme(appearance, prefersDark)

  function change<K extends keyof Appearance>(key: K, value: Appearance[K]) {
    update.mutate({ appearance: { ...appearance, [key]: value } })
  }

  return (
    <>
      <PageHeader
        title="Appearance"
        leading={
          <Button
            variant="plain"
            className="-ml-2 flex items-center gap-0.5"
            onClick={() => navigate('/settings', { replace: true })}
          >
            <ChevronLeftIcon className="h-5 w-5" />
            Settings
          </Button>
        }
      />
      <p className="text-[14px] font-medium text-label-secondary">
        Saved to your account, so every device looks the same.
      </p>
      {update.isError && <ErrorBanner message={toUserMessage(update.error)} />}

      <section aria-label="Preview" className="mt-5 rounded-[28px] bg-bg-elevated p-5 shadow-card">
        <GoalProgressView progress={SAMPLE_PROGRESS} style={appearance.progressStyle} />
      </section>

      <SettingSection title="Theme">
        <SegmentedControl
          label="Theme"
          options={THEME_OPTIONS}
          value={appearance.theme}
          onChange={(theme) => change('theme', theme)}
        />
      </SettingSection>

      <SettingSection
        title="Dark style"
        footer="Used whenever the app is dark, also with System at night."
      >
        <OptionCards
          label="Dark style"
          value={appearance.darkStyle}
          onChange={(darkStyle) => change('darkStyle', darkStyle)}
          options={DARK_STYLES.map((style) => ({
            value: style.value,
            label: style.label,
            description: style.description,
            preview: <DarkStylePreview style={style} />,
          }))}
        />
      </SettingSection>

      <SettingSection title="Accent color" footer="Buttons, the active tab and your avatar.">
        <SwatchPicker
          label="Accent color"
          swatches={ACCENT_COLORS}
          value={profile.accent_color}
          onChange={(accent_color) => update.mutate({ accent_color })}
        />
      </SettingSection>

      <SettingSection title="Goal colors">
        <OptionCards
          label="Goal colors"
          value={appearance.goalPalette}
          onChange={(palette) => change('goalPalette', palette)}
          options={PALETTES.map((palette) => ({
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

      <SettingSection title="Progress style">
        <SegmentedControl
          label="Progress style"
          options={PROGRESS_OPTIONS}
          value={appearance.progressStyle}
          onChange={(style) => change('progressStyle', style)}
        />
      </SettingSection>

      <SettingSection
        title="Category chips"
        footer="How the category filter on the Ingredients page is laid out."
      >
        <SegmentedControl
          label="Category chips"
          options={CATEGORY_LAYOUT_OPTIONS}
          value={appearance.categoryLayout}
          onChange={(layout) => change('categoryLayout', layout)}
        />
      </SettingSection>
    </>
  )
}
