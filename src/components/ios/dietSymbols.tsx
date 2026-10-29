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

/** Halal: a crescent. */
function CrescentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Mark {...props}>
      <path d="M9.6 7.6A4.4 4.4 0 0 1 4.4 2.4a4.4 4.4 0 1 0 5.2 5.2z" />
    </Mark>
  )
}

type DietMarksProps = {
  readonly vegan: boolean
  readonly halal: boolean
}

/**
 * The marks that apply, named by one label for the whole group ("vegan, halal") so a row's own
 * name stays first and readable; nothing when none applies.
 */
export function DietMarks({ vegan, halal }: DietMarksProps) {
  if (!vegan && !halal) return null
  const label = [vegan && 'vegan', halal && 'halal'].filter(Boolean).join(', ')
  return (
    <span role="img" aria-label={label} className="inline-flex shrink-0 items-center gap-1">
      {vegan && (
        <span className="inline-flex text-vegan">
          <LeafIcon />
        </span>
      )}
      {halal && (
        <span className="inline-flex text-halal">
          <CrescentIcon />
        </span>
      )}
    </span>
  )
}
