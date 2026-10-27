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

export function StarSymbol(props: SVGProps<SVGSVGElement>) {
  return (
    <Symbol fill="currentColor" strokeWidth="0.6" {...props}>
      <path d="M6 .8l1.5 3.2 3.5.4-2.6 2.4.7 3.5L6 8.5l-3.1 1.8.7-3.5L1 4.4 4.5 4z" />
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
