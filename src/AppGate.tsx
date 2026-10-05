import { lazy, Suspense } from 'react'
import { CurrentUserContext } from './app/currentUser'
import { Button } from './components/ios/Button'
import { ErrorBanner } from './components/ios/ErrorBanner'
import { Screen } from './components/ios/Screen'
import { Splash } from './components/ios/Splash'
import { AuthScreen } from './features/auth/AuthScreen'
import { useAuth } from './features/auth/authContext'
import { useProfile } from './features/household/hooks'
import { OnboardingScreen } from './features/household/OnboardingScreen'
import { toUserMessage } from './lib/errors'

// the signed-in app is its own chunk: the login screen loads without it
const TabShell = lazy(() =>
  import('./app/TabShell').then((module) => ({ default: module.TabShell })),
)

/** Routes between loading → login → household onboarding → app, based on session and profile. */
export function AppGate() {
  const auth = useAuth()
  if (auth.status === 'loading') return <Splash />
  if (auth.status === 'signedOut') return <AuthScreen />
  return <SignedInGate userId={auth.session.user.id} />
}

function SignedInGate({ userId }: { readonly userId: string }) {
  const profile = useProfile(userId)

  // cached data wins over a failed refresh (e.g. offline): only show an error without any data
  if (profile.data === undefined && profile.fetchStatus === 'paused') {
    return (
      <Screen title="CALculator">
        <p className="mt-4 text-[17px]">You’re offline.</p>
        <p className="mt-1 text-[15px] text-label-secondary">
          Connect to the internet once to load your account. After that the app also works offline.
        </p>
      </Screen>
    )
  }
  if (profile.data === undefined && !profile.isError) return <Splash />
  if (profile.data === undefined) {
    return (
      <Screen title="CALculator">
        <ErrorBanner message={toUserMessage(profile.error)} />
        <div className="mt-4">
          <Button onClick={() => void profile.refetch()}>Try again</Button>
        </div>
      </Screen>
    )
  }

  const householdId = profile.data.household_id
  if (!householdId) return <OnboardingScreen />
  return (
    <CurrentUserContext value={{ profile: profile.data, householdId }}>
      <Suspense fallback={<Splash />}>
        <TabShell />
      </Suspense>
    </CurrentUserContext>
  )
}
