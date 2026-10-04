import { useState } from 'react'
import { GroupedSection } from '../../components/ios/GroupedSection'
import { ListRow } from '../../components/ios/ListRow'
import { Sheet } from '../../components/ios/Sheet'

// TEMPORARY: diagnoses the strip at the bottom of the iPhone home-screen app; remove once fixed

type Measurement = { readonly label: string; readonly value: string }

/** Renders a hidden probe with one CSS property and reads back its size in px. */
function cssPixels(property: 'height' | 'paddingBottom' | 'paddingTop', value: string): string {
  const probe = document.createElement('div')
  probe.style.position = 'fixed'
  probe.style.visibility = 'hidden'
  probe.style.pointerEvents = 'none'
  probe.style[property] = value
  document.body.append(probe)
  const computed = getComputedStyle(probe)[property]
  probe.remove()
  return computed
}

function px(value: number | undefined): string {
  return value === undefined ? 'n/a' : `${Math.round(value * 10) / 10}px`
}

function measure(): readonly Measurement[] {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return [
    { label: 'Home-screen app', value: standalone ? 'yes' : 'no' },
    { label: 'screen.height', value: px(window.screen.height) },
    { label: 'window.innerHeight', value: px(window.innerHeight) },
    { label: 'visualViewport.height', value: px(window.visualViewport?.height) },
    { label: 'html clientHeight', value: px(document.documentElement.clientHeight) },
    { label: '100dvh', value: cssPixels('height', '100dvh') },
    { label: '100lvh', value: cssPixels('height', '100lvh') },
    { label: '100svh', value: cssPixels('height', '100svh') },
    { label: 'shortfall fix', value: cssPixels('height', 'var(--viewport-shortfall)') },
    { label: 'safe-area top', value: cssPixels('paddingTop', 'env(safe-area-inset-top)') },
    { label: 'safe-area bottom', value: cssPixels('paddingBottom', 'env(safe-area-inset-bottom)') },
    { label: 'device pixel ratio', value: String(window.devicePixelRatio) },
    { label: 'user agent', value: navigator.userAgent },
  ]
}

/** Settings row opening a sheet with the device's real viewport numbers. */
export function ScreenInfo() {
  const [measurements, setMeasurements] = useState<readonly Measurement[] | null>(null)
  return (
    <>
      <GroupedSection header="Diagnostics">
        <ListRow title="Screen info" onClick={() => setMeasurements(measure())} />
      </GroupedSection>
      <Sheet open={measurements !== null} onClose={() => setMeasurements(null)} title="Screen info">
        <GroupedSection footer="Take a screenshot of this and send it over.">
          {(measurements ?? []).map(({ label, value }) => (
            <ListRow key={label} title={label} subtitle={value} />
          ))}
        </GroupedSection>
      </Sheet>
    </>
  )
}
