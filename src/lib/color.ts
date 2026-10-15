// WCAG contrast helpers for user-chosen colors (#rrggbb only, like profiles.accent_color)

const DARK_INK = '#0c0c0d'
const LIGHT_INK = '#ffffff'
/** WCAG AA for normal text */
const TEXT_CONTRAST = 4.5
/** WCAG AA for large or bold text */
const LARGE_TEXT_CONTRAST = 3
const MIX_STEP = 0.05
/** enough for a shape (a ring, a fill) to stand out from the surface around it */
const GRAPHIC_CONTRAST = 1.3
/** lighter than this, a fill vanishes on white cards (white itself, not lime or yellow) */
const NEAR_WHITE_LUMINANCE = 0.8

type Rgb = readonly [number, number, number]

function toRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((channel) => {
    const srgb = channel / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

/** `from` blended towards `to`; weight 0 = from, 1 = to. */
export function mixHex(from: string, to: string, weight: number): string {
  const a = toRgb(from)
  const b = toRgb(to)
  const channel = (index: 0 | 1 | 2) => a[index] + (b[index] - a[index]) * weight
  return toHex([channel(0), channel(1), channel(2)])
}

/**
 * Text color for content placed on a `fill` of this color. White wins whenever it is legible
 * (labels on fills are bold, so the large-text level applies), like iOS buttons on system blue.
 */
export function onColor(fill: string): string {
  return contrastRatio(fill, LIGHT_INK) >= LARGE_TEXT_CONTRAST ? LIGHT_INK : DARK_INK
}

/** `color`, darkened or lightened just enough to be readable as text on `background`. */
export function readableInk(color: string, background: string): string {
  const target = luminance(background) > 0.5 ? DARK_INK : LIGHT_INK
  for (let weight = 0; weight < 1; weight += MIX_STEP) {
    const candidate = mixHex(color, target, weight)
    if (contrastRatio(candidate, background) >= TEXT_CONTRAST) return candidate
  }
  return target
}

/** White, or close to it: on a white card it needs an edge to be seen. */
export function isNearWhite(color: string): boolean {
  return luminance(color) > NEAR_WHITE_LUMINANCE
}

/** `color`, darkened or lightened just enough to stand out as a shape on `surface`. */
export function visibleOn(color: string, surface: string): string {
  const target = luminance(surface) > 0.5 ? DARK_INK : LIGHT_INK
  for (let weight = 0; weight < 1; weight += MIX_STEP) {
    const candidate = mixHex(color, target, weight)
    if (contrastRatio(candidate, surface) >= GRAPHIC_CONTRAST) return candidate
  }
  return target
}
