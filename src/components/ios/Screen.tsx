import type { ReactNode } from 'react'

type ScreenProps = { readonly title: string; readonly children: ReactNode }

/** Full-height page with an iOS large title, respecting the notch and home indicator. */
export function Screen({ title, children }: ScreenProps) {
  return (
    <main className="min-h-dvh bg-bg pt-safe-top pb-safe-bottom text-label">
      <div className="mx-auto max-w-md px-4 pb-8">
        <header className="pt-4 pb-2">
          <h1 className="text-[34px] leading-tight font-bold tracking-tight">{title}</h1>
        </header>
        {children}
      </div>
    </main>
  )
}
