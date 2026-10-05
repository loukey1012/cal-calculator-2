import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/ios/Button'
import { ErrorBanner } from '../../components/ios/ErrorBanner'
import { ChevronLeftIcon } from '../../components/ios/icons'
import { PageHeader } from '../../components/ios/PageHeader'
import { toUserMessage } from '../../lib/errors'

type AppearanceSubPageProps = {
  readonly title: string
  /** where the back button leads, and its label */
  readonly back: { readonly path: string; readonly label: string }
  /** a failed save of one of this page's choices */
  readonly saveError: Error | null
  readonly children: ReactNode
}

/** A page inside Settings › Appearance: back button, large title, save errors. */
export function AppearanceSubPage({ title, back, saveError, children }: AppearanceSubPageProps) {
  const navigate = useNavigate()
  return (
    <>
      <PageHeader
        title={title}
        leading={
          <Button
            variant="plain"
            className="-ml-2 flex items-center gap-0.5"
            onClick={() => navigate(back.path, { replace: true })}
          >
            <ChevronLeftIcon className="h-5 w-5" />
            {back.label}
          </Button>
        }
      />
      {saveError && <ErrorBanner message={toUserMessage(saveError)} />}
      {children}
    </>
  )
}
