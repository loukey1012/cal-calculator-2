import { appIconFiles } from './appIcon'
import { APP_ICON_OPTIONS, APPEARANCE_PATH } from './appearanceLabels'
import { OptionCards, SettingSection } from './AppearanceOptions'
import { AppearanceSubPage } from './AppearanceSubPage'
import { useAppearanceSettings } from './useAppearanceSettings'

/** Settings › Appearance › App icon: the icon offered when adding the app to the home screen. */
export function AppIconPage() {
  const { appearance, update, change } = useAppearanceSettings()

  return (
    <AppearanceSubPage
      title="App icon"
      back={{ path: APPEARANCE_PATH, label: 'Appearance' }}
      saveError={update.error}
    >
      <SettingSection
        title="Icon"
        footer="iPhone keeps the icon an app had when it was added. To see a new icon, remove CALculator from your home screen, then add it again from Safari (Share › Add to Home Screen). Your data stays in your account."
      >
        <OptionCards
          label="App icon"
          value={appearance.appIcon}
          onChange={(icon) => change('appIcon', icon)}
          options={APP_ICON_OPTIONS.map((icon) => ({
            ...icon,
            preview: (
              <img
                src={appIconFiles(icon.value).svg}
                alt=""
                className="h-16 w-16 rounded-[22.37%]"
              />
            ),
          }))}
        />
      </SettingSection>
    </AppearanceSubPage>
  )
}
