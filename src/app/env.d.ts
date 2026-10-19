/** The running version, set at build time (vite.config.ts; fixed in vitest.config.ts). */
declare const __APP_VERSION__: { readonly id: string; readonly builtAt: string }
/** where the label reader's engine and language files are served (vite.config ocrAssets) */
declare const __OCR_BASE__: string
