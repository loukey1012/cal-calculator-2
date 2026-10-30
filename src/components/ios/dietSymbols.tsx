import type { SVGProps } from 'react'

// Small outlined marks on a 12 x 12 grid, drawn in the diet colors (index.css).
function Mark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-3.5 w-3.5"
      {...props}
    />
  )
}

/** Vegan: a leaf with its vein. */
function LeafIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Mark {...props}>
      <path d="M2.2 9.8C1.6 5.4 4.4 2 10 2c0 5.2-2.8 8-6.6 7.6" />
      <path d="M2.2 9.8 7 5" />
    </Mark>
  )
}

/** Halal: an H in a circle. */
function HalalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Mark {...props}>
      <circle cx="6" cy="6" r="5" />
      <path d="M4.2 3.8v4.4M7.8 3.8v4.4M4.2 6h3.6" strokeWidth={1.3} />
    </Mark>
  )
}

type DietMarksProps = {
  readonly vegan: boolean
  readonly halal: boolean
  /** placement in the surrounding row, e.g. "ml-auto" */
  readonly className?: string
}

/**
 * The marks that apply, named by one label for the whole group ("vegan, halal") so a row's own
 * name stays first and readable; nothing when none applies.
 */
export function DietMarks({ vegan, halal, className = '' }: DietMarksProps) {
  if (!vegan && !halal) return null
  const label = [vegan && 'vegan', halal && 'halal'].filter(Boolean).join(', ')
  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex shrink-0 items-center gap-1 ${className}`}
    >
      {vegan && (
        <span className="inline-flex text-vegan">
          <LeafIcon />
        </span>
      )}
      {halal && (
        <span className="inline-flex text-halal">
          <HalalIcon />
        </span>
      )}
    </span>
  )
}
