import { Component, type ReactNode } from 'react'
import { Button } from './Button'

type CrashBoundaryProps = {
  readonly children: ReactNode
  /** starts the app again; the whole page reloads by default */
  readonly onReload?: () => void
}

type CrashBoundaryState = { readonly crashed: boolean }

/**
 * A page that throws while rendering shows a message with Reload instead of leaving the app
 * blank (an installed web app has no reload button of its own).
 */
export class CrashBoundary extends Component<CrashBoundaryProps, CrashBoundaryState> {
  state: CrashBoundaryState = { crashed: false }

  static getDerivedStateFromError(): CrashBoundaryState {
    return { crashed: true }
  }

  render() {
    if (!this.state.crashed) return this.props.children
    const reload = this.props.onReload ?? (() => window.location.reload())
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-label">
        <p role="alert" className="text-[17px] font-semibold">
          Something went wrong. Reload to continue.
        </p>
        <Button onClick={reload}>Reload</Button>
      </main>
    )
  }
}
