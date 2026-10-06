import type { SVGProps } from 'react'

// Rounded outline icons; they inherit the text color.
function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
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

export function CookIcon() {
  return (
    <Icon>
      <path d="M4 10.5h16v5.5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-5.5ZM2.5 10.5h1.5M20 10.5h1.5M9 3.5c-.8.9-.8 2.1 0 3M12.5 3.5c-.8.9-.8 2.1 0 3M16 3.5c-.8.9-.8 2.1 0 3" />
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

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={2} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </Icon>
  )
}

export function BreakfastIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </Icon>
  )
}

export function LunchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M3 11h18a9 9 0 0 1-18 0z" />
      <path d="M8 7.5c0-1.5 1-2 1-3.5M12 7.5c0-1.5 1-2 1-3.5M16 7.5c0-1.5 1-2 1-3.5" />
    </Icon>
  )
}

export function DinnerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </Icon>
  )
}

export function SnackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r="0.8" fill="currentColor" />
      <circle cx="14" cy="14.5" r="0.8" fill="currentColor" />
      <circle cx="15" cy="9" r="0.8" fill="currentColor" />
    </Icon>
  )
}

export function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="M14.5 6l-6 6 6 6" />
    </Icon>
  )
}
