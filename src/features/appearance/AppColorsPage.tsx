import { SegmentedControl } from '../../components/ios/SegmentedControl'
import { SCHEME_SURFACES, type DarkStyle, type LightStyle, type Scheme } from './appearance'
import {
  APPEARANCE_PATH,
  DARK_STYLE_LABELS,
  LIGHT_STYLE_LABELS,
  THEME_OPTIONS,
} from './appearanceLabels'
import { OptionCards, SettingSection } from './AppearanceOptions'
import { ColorPicker } from './ColorPicker'
import { AppearanceSubPage } from './AppearanceSubPage'
import { useAppearanceSettings } from './useAppearanceSettings'

const MANROPE = "'Manrope Variable', sans-serif"
const SPACE_GROTESK = "'Space Grotesk Variable', sans-serif"

type StyleOption<T extends string> = {
  readonly value: T
  readonly scheme: Scheme
  readonly description: string
  readonly fontFamily: string
}

const LIGHT_STYLES: ReadonlyArray<StyleOption<LightStyle>> = [
  { value: 'classic', scheme: 'light', description: 'Cool grey and white', fontFamily: MANROPE },
  { value: 'pink', scheme: 'pink', description: 'Soft blush tones', fontFamily: MANROPE },
]

const DARK_STYLES: ReadonlyArray<StyleOption<DarkStyle>> = [
  { value: 'soft', scheme: 'soft', description: 'Deep grey, rounded', fontFamily: MANROPE },
  {
    value: 'bento',
    scheme: 'bento',
    description: 'Near-black, bold numbers',
    fontFamily: SPACE_GROTESK,
  },
]

/** A tiny page and card painted in the style's own colors, whatever the app shows now. */
function StylePreview({
  scheme,
  fontFamily,
}: {
  readonly scheme: Scheme
  readonly fontFamily: string
}) {
  const { bg, card, label } = SCHEME_SURFACES[scheme]
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
        <span className="text-[13px] font-bold" style={{ fontFamily, color: label }}>
          1,340
        </span>
      </span>
      <span className="accent-edge h-1.5 w-3/5 rounded-full bg-accent" />
    </span>
  )
}

function styleCards<T extends string>(
  styles: ReadonlyArray<StyleOption<T>>,
  labels: Record<T, string>,
) {
  return styles.map((style) => ({
    value: style.value,
    label: labels[style.value],
    description: style.description,
    preview: <StylePreview scheme={style.scheme} fontFamily={style.fontFamily} />,
  }))
}

/** Settings › Appearance › App colors: theme, light and dark style, accent color. */
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
        title="Light style"
        footer="Used whenever the app is light, also with System during the day."
      >
        <OptionCards
          label="Light style"
          value={appearance.lightStyle}
          onChange={(lightStyle) => change('lightStyle', lightStyle)}
          options={styleCards(LIGHT_STYLES, LIGHT_STYLE_LABELS)}
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
          options={styleCards(DARK_STYLES, DARK_STYLE_LABELS)}
        />
      </SettingSection>

      <SettingSection title="Accent color" footer="Buttons, the active tab and your avatar.">
        <ColorPicker
          label="Accent color"
          value={profile.accent_color}
          onChange={(accent_color) => update.mutate({ accent_color })}
        />
      </SettingSection>
    </AppearanceSubPage>
  )
}
