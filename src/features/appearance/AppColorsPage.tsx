import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { ACCENT_COLORS, SCHEME_SURFACES, type DarkStyle } from './appearance'
import { APPEARANCE_PATH, DARK_STYLE_LABELS, THEME_OPTIONS } from './appearanceLabels'
import { OptionCards, SettingSection, SwatchPicker } from './AppearanceOptions'
import { AppearanceSubPage } from './AppearanceSubPage'
import { useAppearanceSettings } from './useAppearanceSettings'

const DARK_STYLES: ReadonlyArray<{
  value: DarkStyle
  description: string
  fontFamily: string
}> = [
  {
    value: 'soft',
    description: 'Deep grey, rounded',
    fontFamily: "'Manrope Variable', sans-serif",
  },
  {
    value: 'bento',
    description: 'Near-black, bold numbers',
    fontFamily: "'Space Grotesk Variable', sans-serif",
  },
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

/** Settings › Appearance › App colors: theme, dark style and accent color. */
export function AppColorsPage() {
  const { profile, appearance, update, change } = useAppearanceSettings()

  return (
    <AppearanceSubPage
      title="App colors"
      back={{ path: APPEARANCE_PATH, label: 'Appearance' }}
      saveError={update.error}
    >
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
            label: DARK_STYLE_LABELS[style.value],
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
    </AppearanceSubPage>
  )
}
