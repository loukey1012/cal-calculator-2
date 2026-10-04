import type { ReactNode } from 'react'

type TabBarItem = { readonly id: string; readonly label: string; readonly icon: ReactNode }

type TabBarProps = {
  readonly items: readonly TabBarItem[]
  readonly activeIndex: number
  readonly onSelect: (index: number) => void
  /** tapping the active tab again, which on iOS scrolls back to the top */
  readonly onReselect: (index: number) => void
}

/** Floating pill above the home indicator; the active tab shows its label in an accent tint. */
export function TabBar({ items, activeIndex, onSelect, onReselect }: TabBarProps) {
  return (
    <nav aria-label="Tabs" className="fixed inset-x-0 bottom-(--tabbar-bottom) z-10 px-4">
      <ul className="mx-auto flex h-(--tabbar-height) max-w-md items-center justify-between rounded-full bg-bar px-2 shadow-bar backdrop-blur-xl">
        {items.map((item, index) => {
          const active = index === activeIndex
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                onClick={() => (active ? onReselect(index) : onSelect(index))}
                className={`flex h-12 items-center justify-center gap-2 rounded-full transition-colors ${
                  active
                    ? 'bg-accent-soft px-4 text-[14px] font-extrabold text-accent-ink'
                    : 'w-13 text-label-secondary'
                }`}
              >
                <span className="h-6 w-6 shrink-0">{item.icon}</span>
                {active && <span aria-hidden="true">{item.label}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
