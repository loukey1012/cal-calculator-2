import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

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

// ─── reading nutrition labels: text recognition served by the app itself ─────────────────────

const require = createRequire(import.meta.url)
const packageDir = (name: string, from = require) => dirname(from.resolve(`${name}/package.json`))
const tesseractDir = packageDir('tesseract.js')
const tesseractVersion = (
  JSON.parse(readFileSync(join(tesseractDir, 'package.json'), 'utf8')) as { version: string }
).version
// the engine is a dependency of tesseract.js, found from there
const coreDir = packageDir('tesseract.js-core', createRequire(join(tesseractDir, 'package.json')))
/** versioned, so the files can be cached for good (vercel.json) */
const OCR_BASE = `/ocr/${tesseractVersion}`

/** Published path (under OCR_BASE) → file: the worker, the LSTM engines, German and English. */
const OCR_FILES: Readonly<Record<string, string>> = {
  'worker.min.js': join(tesseractDir, 'dist/worker.min.js'),
  // tesseract.js picks one of these by what the phone supports (relaxed SIMD, SIMD, neither)
  ...Object.fromEntries(
    ['lstm', 'simd-lstm', 'relaxedsimd-lstm'].map((variant) => [
      `core/tesseract-core-${variant}.wasm.js`,
      join(coreDir, `tesseract-core-${variant}.wasm.js`),
    ]),
  ),
  ...Object.fromEntries(
    ['deu', 'eng'].map((lang) => [
      `lang/${lang}.traineddata.gz`,
      join(packageDir(`@tesseract.js-data/${lang}`), `4.0.0_best_int/${lang}.traineddata.gz`),
    ]),
  ),
}

/**
 * Serves the text recognition files at OCR_BASE in dev and adds them to the build. They are
 * fetched only when a label is read, and kept by the service worker from then on.
 */
function ocrAssets(): Plugin {
  return {
    name: 'ocr-assets',
    configureServer(server) {
      server.middlewares.use(OCR_BASE, (request, response, next) => {
        const file = OCR_FILES[(request.url ?? '').replace(/^\//, '').split('?')[0] ?? '']
        if (!file) return next()
        response.setHeader(
          'Content-Type',
          file.endsWith('.js') ? 'text/javascript' : 'application/octet-stream',
        )
        response.end(readFileSync(file))
      })
    },
    generateBundle() {
      for (const [path, file] of Object.entries(OCR_FILES)) {
        this.emitFile({
          type: 'asset',
          fileName: `${OCR_BASE.slice(1)}/${path}`,
          source: readFileSync(file),
        })
      }
    },
  }
}

export default defineConfig({
  server: { proxy: OFF_SEARCH_PROXY },
  preview: { proxy: OFF_SEARCH_PROXY },
  // the running version (src/app/appVersion.ts): a new commit is a new version
  define: {
    __APP_VERSION__: JSON.stringify({ id: buildCommit(), builtAt: new Date().toISOString() }),
    __OCR_BASE__: JSON.stringify(OCR_BASE),
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
            // reading a label, loaded only then
            { name: 'ocr', test: /node_modules[\\/]tesseract\.js[\\/]/, priority: 2 },
            { name: 'vendor', test: /node_modules[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    ocrAssets(),
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
        // the label reader's ~8 MB stay out of every install: kept once first used (below)
        globIgnores: ['ocr/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/ocr/'),
            handler: 'CacheFirst',
            options: { cacheName: 'ocr', cacheableResponse: { statuses: [200] } },
          },
        ],
        navigateFallback: '/index.html',
        // the search proxy is never the app page
        navigateFallbackDenylist: [/^\/off\//],
      },
    }),
  ],
})
