import type { SVGProps } from 'react'

// Outline icons in the spirit of SF Symbols; they inherit the text color.
function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  )
}

export function TodayIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8.5" strokeOpacity={0.35} />
      <path d="M12 3.5a8.5 8.5 0 1 1-8.1 11" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function HistoryIcon() {
  return (
    <Icon>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4M8 13h2M14 13h2M8 16.5h2" />
    </Icon>
  )
}

export function IngredientsIcon() {
  return (
    <Icon>
      <path d="M7 3v7a2 2 0 0 0 4 0V3M9 10v11M17 21V3c-2.2 1.2-3 3.6-3 6.5V13h3" />
    </Icon>
  )
}

export function SettingsIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
    </Icon>
  )
}

export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <path d="M9.5 6l6 6-6 6" />
    </Icon>
  )
}
