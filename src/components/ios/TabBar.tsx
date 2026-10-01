import type { ReactNode } from 'react'

export type TabBarItem = { readonly id: string; readonly label: string; readonly icon: ReactNode }

type TabBarProps = {
  readonly items: readonly TabBarItem[]
  readonly activeIndex: number
  readonly onSelect: (index: number) => void
  /** tapping the active tab again, which on iOS scrolls back to the top */
  readonly onReselect: (index: number) => void
}

export function TabBar({ items, activeIndex, onSelect, onReselect }: TabBarProps) {
  return (
    <nav
      aria-label="Tabs"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-separator bg-bg-elevated/80 pb-safe-bottom backdrop-blur-xl"
    >
      <ul className="mx-auto flex max-w-md">
        {items.map((item, index) => {
          const active = index === activeIndex
          return (
            <li key={item.id} className="flex-1">
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => (active ? onReselect(index) : onSelect(index))}
                className={`flex h-[49px] w-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                  active ? 'text-accent' : 'text-label-secondary'
                }`}
              >
                <span className="h-6 w-6">{item.icon}</span>
                {item.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
