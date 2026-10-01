import type { ReactNode } from 'react'
import { PageHeader } from './PageHeader'

type ScreenProps = { readonly title: string; readonly children: ReactNode }

/** Full-height page outside the tabs (login, onboarding), respecting the notch and home indicator. */
export function Screen({ title, children }: ScreenProps) {
  return (
    <main className="min-h-dvh bg-bg pt-safe-top pb-safe-bottom text-label">
      <div className="mx-auto max-w-md px-4 pb-8">
        <PageHeader title={title} />
        {children}
      </div>
    </main>
  )
}
