import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

const APP_NAME = 'CALculator'

// Open Food Facts' product search, reached through the app's own address (vercel.json does the
// same in production): its servers don't allow searches straight from the browser
const OFF_SEARCH_PROXY = {
  '/off/search': {
    target: 'https://search.openfoodfacts.org',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/off\/search/, '/search'),
  },
}

/** The commit being built: Vercel names it; locally ask git. */
function buildCommit(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

export default defineConfig({
  server: { proxy: OFF_SEARCH_PROXY },
  preview: { proxy: OFF_SEARCH_PROXY },
  // the running version (src/app/appVersion.ts): a new commit is a new version
  define: {
    __APP_VERSION__: JSON.stringify({ id: buildCommit(), builtAt: new Date().toISOString() }),
  },
  build: {
    rolldownOptions: {
      output: {
        // libraries change rarely: separate chunks stay cached across app updates
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/,
              priority: 3,
            },
            { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/, priority: 2 },
            // the barcode scanner, loaded only when scanning
            {
              name: 'barcode',
              test: /node_modules[\\/](barcode-detector|zxing-wasm)[\\/]/,
              priority: 2,
            },
            { name: 'vendor', test: /node_modules[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // a new version waits and is offered ("New version ready") instead of taking over mid-use;
      // registered in src/app/registerServiceWorker.ts
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME,
        description: 'Household meal and nutrition tracker',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f3f4f7',
        theme_color: '#f3f4f7',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // wasm: the barcode scanner's engine, so scanning works offline too
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,wasm}'],
        navigateFallback: '/index.html',
        // the search proxy is never the app page
        navigateFallbackDenylist: [/^\/off\//],
      },
    }),
  ],
})
