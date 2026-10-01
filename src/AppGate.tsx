import { Button } from './components/ios/Button'
import { ErrorBanner } from './components/ios/ErrorBanner'
import { Screen } from './components/ios/Screen'
import { Splash } from './components/ios/Splash'
import { AuthScreen } from './features/auth/AuthScreen'
import { useAuth } from './features/auth/authContext'
import { useProfile } from './features/household/hooks'
import { HouseholdHome } from './features/household/HouseholdHome'
import { OnboardingScreen } from './features/household/OnboardingScreen'
import { toUserMessage } from './lib/errors'

/** Routes between loading → login → household onboarding → app, based on session and profile. */
export function AppGate() {
  const auth = useAuth()
  if (auth.status === 'loading') return <Splash />
  if (auth.status === 'signedOut') return <AuthScreen />
  return <SignedInGate userId={auth.session.user.id} />
}

function SignedInGate({ userId }: { readonly userId: string }) {
  const profile = useProfile(userId)

  if (profile.isPending) return <Splash />
  if (profile.isError) {
    return (
      <Screen title="CALculator2">
        <ErrorBanner message={toUserMessage(profile.error)} />
        <div className="mt-4">
          <Button onClick={() => void profile.refetch()}>Try again</Button>
        </div>
      </Screen>
    )
  }

  const householdId = profile.data.household_id
  if (!householdId) return <OnboardingScreen />
  return <HouseholdHome profile={profile.data} householdId={householdId} />
}
