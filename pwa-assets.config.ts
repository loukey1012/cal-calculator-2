import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    // full-bleed background: iOS applies its own rounded mask
    apple: { ...minimal2023Preset.apple, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0 },
  },
  images: ['public/icon.svg'],
})
