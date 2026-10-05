import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'
import { APP_ICONS } from './src/features/appearance/appearance'

// the icons to pick from in Settings › Appearance › App icon: only the home-screen icon is
// needed per choice (the browser tab uses the SVG itself, the manifest the default icon)
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, sizes: [], favicons: [] },
    maskable: { ...minimal2023Preset.maskable, sizes: [] },
    apple: { ...minimal2023Preset.apple, padding: 0 },
  },
  images: APP_ICONS.map((icon) => `public/icons/${icon}/icon.svg`),
})
