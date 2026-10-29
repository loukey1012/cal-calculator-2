import type { SVGProps } from 'react'

// Small marks for the corners of a calendar cell, also used by the key. Drawn with currentColor,
// so each one takes its color from the class where it is placed.
function Symbol({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 12 12"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function WineGlassSymbol(props: SVGProps<SVGSVGElement>) {
  return (
    <Symbol {...props}>
      <path d="M3 1.5h6l-.4 3A2.6 2.6 0 0 1 6 7 2.6 2.6 0 0 1 3.4 4.5z" />
      <path d="M6 7v3.5M4 10.5h4" />
    </Symbol>
  )
}

/** Cheat meal: a fork on the left (two tines joined at the base, handle) and a knife on the right. */
export function ForkKnifeSymbol(props: SVGProps<SVGSVGElement>) {
  return (
    <Symbol {...props}>
      <path d="M2 1v3.5M5 1v3.5M2 4.5a1.5 1.5 0 0 0 3 0M3.5 6v4.5" />
      <path d="M9 10.5v-9c-1.5 1-2 2.5-2 4h2" />
    </Symbol>
  )
}

/** Bathroom scale: a rounded body with the dial on top. */
export function ScaleSymbol(props: SVGProps<SVGSVGElement>) {
  return (
    <Symbol {...props}>
      <rect x="1.5" y="1.5" width="9" height="9" rx="2" />
      <path d="M4 5a2 2 0 0 1 4 0M6 5l.9-.9" />
    </Symbol>
  )
}

/** Sex day: an outlined heart. */
export function HeartSymbol(props: SVGProps<SVGSVGElement>) {
  return (
    <Symbol {...props}>
      <path d="M6 10.3 1.9 6.4a2.4 2.4 0 0 1 3.4-3.4L6 3.7l.7-.7a2.4 2.4 0 0 1 3.4 3.4z" />
    </Symbol>
  )
}

/** Gym day: a dumbbell, kept to a bar and two plates so it stays legible at 9 px. */
export function DumbbellSymbol(props: SVGProps<SVGSVGElement>) {
  return (
    <Symbol {...props}>
      <path d="M1 6h10M3 3.5v5M9 3.5v5" />
    </Symbol>
  )
}
